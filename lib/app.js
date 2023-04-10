//
// Copyright 2022 Perforce Software
//
import createError from 'http-errors'
import express from 'express'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import session from 'express-session'
import morgan from 'morgan'
import helmet from 'helmet'
import passport from 'passport'
import RedisStore from 'connect-redis'
import memorystore from 'memorystore'

// Load the environment before the bulk of our code initializes, otherwise it
// will be too late due to the `import` early-binding behavior.
import 'helix-auth-svc/lib/env.js'
import container from 'helix-auth-svc/lib/container.js'
import indexRouter from 'helix-auth-svc/routes/index.js'
import statusRouter from 'helix-auth-svc/routes/status.js'
import oauthRouter from 'helix-auth-svc/lib/features/login/presentation/routes/oauth.js'
import multiRouter from 'helix-auth-svc/lib/features/login/presentation/routes/multi.js'
import oidcRouter from 'helix-auth-svc/lib/features/login/presentation/routes/oidc.js'
import requestsRouter from 'helix-auth-svc/lib/features/login/presentation/routes/requests.js'
import samlRouter from 'helix-auth-svc/lib/features/login/presentation/routes/saml.js'
import usersRouter from 'helix-auth-svc/lib/features/scim/presentation/routes/users.js'
import groupsRouter from 'helix-auth-svc/lib/features/scim/presentation/routes/groups.js'
import settingsRouter from 'helix-auth-svc/lib/features/admin/presentation/routes/settings.js'
import tokensRouter from 'helix-auth-svc/lib/features/admin/presentation/routes/tokens.js'

// start the debug logging, show dotenv results if any
const logger = container.resolve('logger')
const settings = container.resolve('settingsRepository')

// Giant function to allow for rebuilding the Express application to apply any
// environmental changes made at runtime.
export default function createApp () {
  detectMisconfiguration()
  const app = express()
  app.use(helmet())

  // view engine setup
  const _dirname = path.dirname(fileURLToPath(import.meta.url))
  app.set('views', [
    path.join(_dirname, '..', 'views'),
    path.join(_dirname, 'features', 'login', 'presentation', 'pages')
  ])
  app.set('view engine', 'ejs')
  app.locals.title = 'Helix Authentication Service'

  const logging = settings.get('LOGGING')
  if (logging) {
    if (logging !== 'none') {
      app.use(morgan('combined', { stream: logger.stream }))
    }
  } else {
    // Use 'common' instead of 'dev' to avoid logging with color, which makes the
    // captured output more difficult to read.
    app.use(morgan('common'))
  }
  app.use(express.json({ type: ['application/scim+json', 'application/json'] }))
  app.use(express.urlencoded({ extended: false }))
  const trustProxy = settings.get('TRUST_PROXY')
  if (trustProxy) {
    // Set the express.js 'trust proxy' setting to allow for serving secure
    // content on an insecure connection (http) when behind a proxy that performs
    // SSL termination (e.g. HAProxy). In such a situation, the connection to the
    // client is secure, and therefore the service can set a "secure" cookie and
    // trust the client will send it back on the next request.
    if (trustProxy === 'true' || trustProxy === 'false') {
      app.set('trust proxy', Boolean(trustProxy))
    } else {
      app.set('trust proxy', trustProxy)
    }
  }
  let sessionStore = null
  const usingRedis = settings.get('REDIS_URL') || settings.get('SENTINEL_CONFIG_FILE')
  if (usingRedis) {
    const connector = container.resolve('redisConnector')
    sessionStore = new RedisStore({ client: connector.client() })
  } else {
    const MemoryStore = memorystore(session)
    sessionStore = new MemoryStore({ checkPeriod: 86400000 })
  }
  const sessionSecret = settings.get('SESSION_SECRET')
  app.use(session({
    store: sessionStore,
    cookie: {
      path: '/',
      httpOnly: true,
      sameSite: 'none',
      secure: 'auto',
      maxAge: 3600000
    },
    name: 'JSESSIONID',
    secret: sessionSecret,
    resave: false,
    rolling: true,
    saveUninitialized: false
  }))
  app.use(express.static(path.join(_dirname, '..', 'public')))
  app.use(passport.initialize())
  app.use(passport.session())

  if (process.env.ADMIN_ENABLED === 'true') {
    app.use('/admin', express.static(path.join(_dirname, '..', 'public', 'admin')))
    app.get('/admin/*', function (req, res) {
      res.sendFile(path.join(_dirname, '..', 'public', 'admin', 'index.html'))
    })
    app.use('/settings', settingsRouter)
    app.use('/tokens', tokensRouter)
  }
  app.use('/multi', multiRouter)
  app.use('/oauth', oauthRouter)
  app.use('/oidc', oidcRouter)
  app.use('/requests', requestsRouter)
  app.use('/saml', samlRouter)
  app.use('/scim/v2/Groups', groupsRouter)
  app.use('/scim/v2/Users', usersRouter)
  app.use('/status', statusRouter)
  app.use('/', indexRouter)

  // catch 404 and forward to error handler
  app.use((req, res, next) => {
    next(createError(404))
  })

  // error handler
  //
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    // render the error page
    res.status(err.status || 500)
    if (err.name !== 'NotFoundError') {
      // log errors that are _not_ the frequently occurring 404
      logger.error('unhandled error: %s, %s', err, err.stack)
    }
    res.render('error', {
      message: err.message,
      details: 'Check the service logs for "unhandled error".'
    })
  })
  return app
}

// Log warnings for any configuration that looks suspicious.
function detectMisconfiguration () {
  // running behind a reverse proxy but did not set "TRUST_PROXY"?
  const protocol = settings.get('PROTOCOL')
  const baseUri = settings.get('SVC_BASE_URI')
  const trustProxy = settings.get('TRUST_PROXY')
  if (protocol && baseUri && !trustProxy) {
    if (protocol === 'http' && baseUri.startsWith('https://')) {
      logger.warning('app: should set TRUST_PROXY if using reverse proxy')
    }
  }
}

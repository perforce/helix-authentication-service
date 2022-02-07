//
// Copyright 2020-2021 Perforce Software
//
import createError from 'http-errors'
import express from 'express'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import session from 'express-session'
import morgan from 'morgan'
import helmet from 'helmet'
import passport from 'passport'
import { Strategy as BearerStrategy } from 'passport-http-bearer'
import dotenv from 'dotenv'
import connectredis from 'connect-redis'
import memorystore from 'memorystore'

// Load the environment before the bulk of our code initializes, otherwise it
// will be too late due to the `import` early-binding behavior.
import 'helix-auth-svc/lib/env.js'
import container from 'helix-auth-svc/lib/container.js'
import indexRouter from 'helix-auth-svc/routes/index.js'
import oauthRouter from 'helix-auth-svc/lib/features/login/presentation/routes/oauth.js'
import oidcRouter from 'helix-auth-svc/lib/features/login/presentation/routes/oidc.js'
import requestsRouter from 'helix-auth-svc/lib/features/login/presentation/routes/requests.js'
import samlRouter from 'helix-auth-svc/lib/features/login/presentation/routes/saml.js'
import usersRouter from 'helix-auth-svc/lib/features/scim/presentation/routes/users.js'
import groupsRouter from 'helix-auth-svc/lib/features/scim/presentation/routes/groups.js'

// check the results of loading the .env file, report any unexpected errors
const dotResult = dotenv.config()
if (dotResult.error) {
  if (dotResult.error.code !== 'ENOENT') {
    console.error(dotResult.error)
  }
}
// start the debug logging, show dotenv results if any
const logger = container.resolve('logger')
let dotenvKeys = new Set()
if (dotResult.parsed) {
  dotenvKeys = new Set(Object.keys(dotResult.parsed))
  const scrubbed = scrubSecrets(dotResult.parsed)
  logger.debug('dotenv results: %o', scrubbed)
}
const settings = container.resolve('settingsRepository')

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
  const RedisStore = connectredis(session)
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
  secret: sessionSecret || 'keyboard cat',
  resave: false,
  rolling: true,
  saveUninitialized: false
}))
app.use(express.static(path.join(_dirname, '..', 'public')))
app.use(passport.initialize())
app.use(passport.session())

app.use('/requests', requestsRouter)
app.use('/oauth', oauthRouter)
app.use('/oidc', oidcRouter)
app.use('/saml', samlRouter)
app.use('/scim/v2/Groups', groupsRouter)
app.use('/scim/v2/Users', usersRouter)
app.use('/', indexRouter)

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404))
})

// set up Bearer token authentication that will be used throughout
const bearerTokenRaw = settings.get('BEARER_TOKEN') || 'keyboard cat'
const bearerToken = Buffer.from(bearerTokenRaw, 'utf-8').toString('base64')
passport.use(new BearerStrategy(
  (token, done) => {
    if (token !== bearerToken) {
      return done(null, false)
    }
    // for non-user specific access, create a placeholder "user" object
    const user = {
      userName: 'test'
    }
    return done(null, user, { scope: 'all' })
  }
))

// error handler
//
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  if (err.name !== 'NotFoundError') {
    // log errors that are _not_ the frequently occurring 404
    logger.error('unhandled error: %s, %s', err, err.stack)
  }
  res.render('error')
})

//
// The configuration-refresh-via-kill feature only works when _not_ running
// inside a container, when typically the service is running as process #1.
//
if (process.pid > 1) {
  logger.info('use `kill -USR2 %s` to reload .env changes', process.pid)
  process.on('SIGUSR2', () => {
    logger.info('received SIGUSR2 signal')
    fs.readFile('.env', (err, data) => {
      if (err) {
        logger.error(`unable to read .env file: ${err}`)
      } else {
        let envConfig = dotenv.parse(data)
        const newenvKeys = new Set(Object.keys(envConfig))
        for (const oldkey of dotenvKeys) {
          if (!newenvKeys.has(oldkey)) {
            logger.info('removing setting %s', oldkey)
            delete process.env[oldkey]
          }
        }
        envConfig = scrubBindOnce(envConfig)
        const scrubbed = scrubSecrets(envConfig)
        logger.debug('reloaded dotenv results: %o', scrubbed)
        for (const k in envConfig) {
          process.env[k] = envConfig[k]
        }
        logger.info('reloaded configuration from .env')
      }
    })
  })
}

// those environmental settings that cannot be modified at runtime
const envBindOnce = new Set([
  'BIND_ADDRESS',
  'CA_CERT_FILE',
  'CA_CERT_PATH',
  'DEBUG',
  'KEY_PASSPHRASE',
  'KEY_PASSPHRASE_FILE',
  'LOGGING',
  'PFX_FILE',
  'PROTOCOL',
  'PORT',
  'REDIS_URL',
  'SESSION_SECRET',
  'SVC_BASE_URI',
  'TRUST_PROXY'
])

function scrubBindOnce (env) {
  const keys = Object.keys(env)
  const obj = {}
  for (const name of keys) {
    if (envBindOnce.has(name)) {
      logger.debug('ignoring bind-once setting %s', name)
    } else {
      obj[name] = env[name]
    }
  }
  return obj
}

function scrubSecrets (env) {
  const keys = Object.keys(env)
  const obj = {}
  for (const name of keys) {
    if (name.match(/secret_file/i)) {
      // the "secret_file" entries are safe
      obj[name] = env[name]
    } else if (name.match(/secret/i)) {
      // but the other "secret" settings are not safe
      obj[name] = '[hidden]'
    } else if (name.match(/passphrase_file/i)) {
      // the "passphrase_file" entries are safe
      obj[name] = env[name]
    } else if (name.match(/passphrase/i)) {
      // but the other "passphrase" settings are not safe
      obj[name] = '[hidden]'
    } else if (name.match(/passwd/i)) {
      obj[name] = '[hidden]'
    } else {
      obj[name] = env[name]
    }
  }
  return obj
}

export default app

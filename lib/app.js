//
// Copyright 2020 Perforce Software
//
const createError = require('http-errors')
const express = require('express')
const path = require('path')
const session = require('express-session')
const morgan = require('morgan')
const helmet = require('helmet')

// load .env file, report any unexpected errors
const dotResult = require('dotenv').config()
if (dotResult.error) {
  if (dotResult.error.code !== 'ENOENT') {
    console.error(dotResult.error)
  }
}
/* global include */
// start the debug logging, show dotenv results if any
const container = include('lib/container')
const logger = container.resolve('logger')
if (dotResult.parsed) {
  const scrubbed = scrubSecrets(dotResult.parsed)
  logger.debug('dotenv results: %o', scrubbed)
}

const indexRouter = include('routes/index')
const oidcRouter = include('lib/features/login/presentation/routes/oidc')
const requestsRouter = include('lib/features/login/presentation/routes/requests')
const samlRouter = include('lib/features/login/presentation/routes/saml')

const app = express()
app.use(helmet())

// view engine setup
app.set('views', [
  path.join(__dirname, '..', 'views'),
  path.join(__dirname, 'features', 'login', 'presentation', 'pages')
])
app.set('view engine', 'ejs')
app.locals.title = 'Helix Authentication Service'

if (process.env.LOGGING) {
  if (process.env.LOGGING !== 'none') {
    app.use(morgan('combined', { stream: logger.stream }))
  }
} else {
  // Use 'common' instead of 'dev' to avoid logging with color, which makes the
  // captured output more difficult to read.
  app.use(morgan('common'))
}
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
if (process.env.TRUST_PROXY) {
  // Set the express.js 'trust proxy' setting to allow for serving secure
  // content on an insecure connection (http) when behind a proxy that performs
  // SSL termination (e.g. HAProxy). In such a situation, the connection to the
  // client is secure, and therefore the service can set a "secure" cookie and
  // trust the client will send it back on the next request.
  if (process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === 'false') {
    app.set('trust proxy', Boolean(process.env.TRUST_PROXY))
  } else {
    app.set('trust proxy', process.env.TRUST_PROXY)
  }
}
let sessionStore = null
if (process.env.REDIS_URL) {
  const redis = require('redis')
  const RedisStore = require('connect-redis')(session)
  const redisClient = redis.createClient({ url: process.env.REDIS_URL })
  sessionStore = new RedisStore({ client: redisClient })
} else {
  const MemoryStore = require('memorystore')(session)
  sessionStore = new MemoryStore({ checkPeriod: 86400000 })
}
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
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  rolling: true,
  saveUninitialized: false
}))
app.use(express.static(path.join(__dirname, '..', 'public')))

app.use('/requests', requestsRouter)
app.use('/oidc', oidcRouter)
app.use('/saml', samlRouter)
app.use('/', indexRouter)

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404))
})

// error handler
//
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  logger.error(err)
  res.render('error')
})

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
    } else {
      obj[name] = env[name]
    }
  }
  return obj
}

module.exports = app

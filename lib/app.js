//
// Copyright 2019 Perforce Software
//
const createError = require('http-errors')
const express = require('express')
const path = require('path')
const session = require('express-session')
const MemoryStore = require('memorystore')(session)
const morgan = require('morgan')
const helmet = require('helmet')

// load .env file, report any unexpected errors
const dotResult = require('dotenv').config()
if (dotResult.error) {
  if (dotResult.error.code !== 'ENOENT') {
    console.error(dotResult.error)
  }
}
// start the debug logging, show dotenv results if any
const logger = require('./logging')
if (dotResult.parsed) {
  const scrubbed = scrubSecrets(dotResult.parsed)
  logger.debug('dotenv results: %o', scrubbed)
}

const indexRouter = require('../routes/index')
const oidcRouter = require('../routes/oidc')
const requestsRouter = require('../routes/requests')
const samlRouter = require('../routes/saml')

const app = express()
app.use(helmet())

// view engine setup
app.set('views', path.join(__dirname, '..', 'views'))
app.set('view engine', 'ejs')
app.locals.title = 'Helix Authentication Service'

if (process.env.LOGGING) {
  app.use(morgan('combined', { stream: logger.stream }))
} else {
  // original behavior prior to the logging configuration changes
  app.use(morgan('dev'))
}
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(session({
  store: new MemoryStore({
    checkPeriod: 86400000
  }),
  name: 'p4authsvc',
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
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

//
// Copyright 2019 Perforce Software
//
const createError = require('http-errors')
const express = require('express')
const path = require('path')
const session = require('express-session')
const MemoryStore = require('memorystore')(session)
const logger = require('morgan')
const debug = require('debug')('oidc:server')
const helmet = require('helmet')
const dotResult = require('dotenv').config()
if (dotResult.error) {
  if (dotResult.error.code !== 'ENOENT') {
    console.error(dotResult.error)
  }
}
if (dotResult.parsed) {
  debug('dotenv results: %o', dotResult.parsed)
}

const indexRouter = require('./routes/index')
const oidcRouter = require('./routes/oidc')
const requestsRouter = require('./routes/requests')
const samlRouter = require('./routes/saml')

const app = express()
app.use(helmet())

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(logger('dev'))
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
app.use(express.static(path.join(__dirname, 'public')))

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
  res.render('error')
})

module.exports = app

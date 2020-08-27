//
// Copyright 2020 Perforce Software
//
const fs = require('fs-extra')
const path = require('path')
const winston = require('winston')

// Send everything to the console by default.
function makeDefault () {
  return winston.createLogger({
    exitOnError: false,
    format: winston.format.combine(
      winston.format.splat(),
      winston.format.timestamp(),
      winston.format.simple()
    ),
    level: 'debug',
    levels: winston.config.syslog.levels,
    transports: [
      new winston.transports.Console({
        handleExceptions: true
      })
    ]
  })
}

// Log nothing by creating a "silent" logger.
// HTTP request logging still goes to stdout as before.
function makeSilent () {
  return winston.createLogger({
    exitOnError: false,
    format: winston.format.simple(),
    level: 'error',
    transports: [
      new winston.transports.Console({
        handleExceptions: true,
        silent: true
      })
    ]
  })
}

function makeSyslogTransport (conf) {
  const { Syslog } = require('winston-syslog')
  const options = {
    app_name: 'helix-auth-svc',
    handleExceptions: true
  }
  if (conf.syslog) {
    const sl = conf.syslog
    if (sl.facility) {
      options.facility = sl.facility
    }
    if (sl.path) {
      options.path = sl.path
    }
    if (sl.host) {
      options.host = sl.host
    }
    if (sl.port) {
      options.port = sl.port
    }
    if (sl.protocol) {
      options.protocol = sl.protocol
    }
  }
  return new Syslog(options)
}

function makeFileTransport (conf) {
  const options = {
    // set a default location for the log
    filename: 'auth-svc.log',
    handleExceptions: true
  }
  if (conf.file) {
    const f = conf.file
    if (f.maxsize) {
      options.maxsize = f.maxsize
    }
    if (f.maxfiles) {
      options.maxFiles = f.maxfiles
    }
    if (f.filename) {
      options.filename = f.filename
    }
  }
  fs.ensureDirSync(path.dirname(options.filename))
  return new winston.transports.File(options)
}

function makeTransport (conf) {
  if (conf.transport === 'console') {
    return new winston.transports.Console({
      handleExceptions: true
    })
  } else if (conf.transport === 'syslog') {
    return makeSyslogTransport(conf)
  } else if (conf.transport === 'file') {
    return makeFileTransport(conf)
  } else {
    throw new Error('unrecognized transport: ' + conf.transport)
  }
}

function makeFormat (conf) {
  // Do not use colors anywhere, they make the output more difficult to read
  // when it is captured to a file by the process manager.
  if (conf.transport === 'syslog') {
    return winston.format.combine(
      winston.format.splat(),
      winston.format.simple()
    )
  } else if (conf.transport === 'console') {
    return winston.format.combine(
      winston.format.splat(),
      winston.format.timestamp(),
      winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    )
  } else {
    return winston.format.combine(
      winston.format.splat(),
      winston.format.timestamp(),
      winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    )
  }
}

function configure () {
  const conf = require(process.env.LOGGING)
  const transport = makeTransport(conf)
  const format = makeFormat(conf)
  const level = conf.level || 'warning'
  return winston.createLogger({
    exitOnError: false,
    format,
    level,
    levels: winston.config.syslog.levels,
    transports: [transport]
  })
}

// Based on the environment and configuration, create a logger.
function makeLogger () {
  try {
    if (process.env.LOGGING) {
      if (process.env.LOGGING === 'none') {
        return makeSilent()
      }
      return configure()
    } else if (process.env.DEBUG) {
      return makeDefault()
    } else {
      return makeSilent()
    }
  } catch (err) {
    console.error('error creating logger:', err)
    // let's hope building the default still works
    return makeDefault()
  }
}

const logger = makeLogger()
logger.on('error', function (err) {
  console.error('logger error:', err)
})
logger.stream = {
  write: function (message, encoding) {
    logger.info(message)
  }
}

module.exports = logger

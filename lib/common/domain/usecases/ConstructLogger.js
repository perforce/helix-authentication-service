//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as path from 'node:path'
import * as fs from 'node:fs'
import winston from 'winston'
import { Syslog } from 'winston-syslog'

/**
 * Construct a logger according to the application configuration.
 */
export default ({ settingsRepository }) => {
  assert.ok(settingsRepository, 'settingsRepository must be defined')
  return async () => {
    const logger = await makeLogger(settingsRepository)
    logger.on('error', function (err) {
      console.error('logger error:', err)
    })
    logger.stream = {
      // eslint-disable-next-line no-unused-vars
      write: function (message, encoding) {
        logger.info(message)
      }
    }
    return logger
  }
}

// Construct an instance of the appropriate logger implementation.
async function makeLogger(settingsRepository) {
  try {
    const loggingFile = settingsRepository.get('LOGGING')
    if (loggingFile) {
      if (loggingFile === 'none') {
        return makeSilent()
      }
      return await configure(loggingFile)
    } else if (settingsRepository.has('DEBUG')) {
      return makeConsole('debug')
    } else {
      return makeConsole('info')
    }
  } catch (err) {
    console.error('error creating logger:', err)
    // let's hope building the default still works
    return makeConsole('info')
  }
}

async function configure(loggingFile) {
  let module
  try {
    module = await import(loggingFile)
  } catch (err) {
    if (err instanceof ReferenceError) {
      // The logging configuration uses an extension (.js) that makes Node.js
      // think that the contents are in ES6 format, but apparently that was not
      // the case. As such, read the configuration file and change the syntax to
      // conform to ES6 standards and try again.
      const contents = fs.readFileSync(loggingFile, 'utf8')
      const filtered = contents.split(/\r?\n/).filter(line => !line.trim().startsWith('//'))
      const folded = filtered.map(line => line.trim()).join('')
      const updated = folded.replace('module.exports =', 'export default')
      module = await import('data:text/javascript,' + updated)
    } else {
      throw err
    }
  }
  const conf = module.default
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

// Dynamically load the Windows event logger that is available only for Windows
// systems; on other platforms this logger will not be functional.
let EventLogger
import('node-windows').then((module) => {
  EventLogger = module.EventLogger
}).catch((err) => {
  // Quietly do nothing with the error as this is most likely not a Windows
  // system, and now we "handled" the error as far as Node.js is concerned.
  if (err === 'inconceivable') {
    console.error(err)
  }
})

// Windows event logging transport based on node-windows module.
class EventTransport extends winston.Transport {
  constructor(options = {}) {
    super(options)
    const eventLog = options.eventLog || 'APPLICATION'
    const source = options.source || 'HelixAuthentication'
    this.logger = new EventLogger(source, eventLog)
  }

  log(info, callback) {
    setImmediate(() => this.emit('logged', info))
    if (info.level === 'warn') {
      this.logger.warn(info.message)
    } else if (info.level === 'error') {
      this.logger.error(info.message)
    } else {
      this.logger.info(info.message)
    }
    callback()
  }
}

// Send everything to the console at the given logging level.
function makeConsole(level) {
  return winston.createLogger({
    exitOnError: false,
    format: winston.format.combine(
      winston.format.splat(),
      winston.format.timestamp(),
      winston.format.simple()
    ),
    level,
    levels: winston.config.syslog.levels,
    transports: [
      new winston.transports.Console({})
    ]
  })
}

// Log nothing by creating a "silent" logger.
// HTTP request logging still goes to stdout as before.
function makeSilent() {
  return winston.createLogger({
    exitOnError: false,
    format: winston.format.simple(),
    level: 'error',
    levels: winston.config.syslog.levels,
    transports: [
      new winston.transports.Console({
        silent: true
      })
    ]
  })
}

function makeSyslogTransport(conf) {
  const options = {
    app_name: 'helix-auth-svc'
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

function makeFileTransport(conf) {
  const options = {
    // set a default location for the log
    filename: 'auth-svc.log'
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
  fs.mkdirSync(path.dirname(options.filename), { recursive: true })
  return new winston.transports.File(options)
}

function makeTransport(conf) {
  if (conf.transport === 'console') {
    return new winston.transports.Console({})
  } else if (conf.transport === 'syslog') {
    return makeSyslogTransport(conf)
  } else if (conf.transport === 'file') {
    return makeFileTransport(conf)
  } else if (conf.transport === 'event') {
    return new EventTransport(conf.event)
  } else {
    throw new Error('unrecognized transport: ' + conf.transport)
  }
}

function makeFormat(conf) {
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

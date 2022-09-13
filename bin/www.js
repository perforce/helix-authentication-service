#!/usr/bin/env node
//
// Copyright 2022 Perforce Software
//
import * as awilix from 'awilix'
import createApp from 'helix-auth-svc/lib/app.js'
import {
  default as container,
  registerLateBindings
} from 'helix-auth-svc/lib/container.js'
import {
  createServer,
  getPort,
  logEnvironment,
  normalizePort
} from 'helix-auth-svc/lib/server.js'
const logger = container.resolve('logger')
const refreshEnvironment = container.resolve('refreshEnvironment')
const settings = container.resolve('settingsRepository')

function startServer () {
  // Get port from environment and store in Express.
  const port = normalizePort(getPort(settings))
  const app = createApp()
  app.set('port', port)

  // Create HTTP/S server.
  const server = createServer(app, settings)

  // Listen on provided port, on all network interfaces.
  const bindaddr = settings.get('BIND_ADDRESS')
  if (bindaddr) {
    // Allow explicitly setting the bind address if necessary. According to the
    // Node documentation, it binds to the unspecified IPv4 _and_ IPv6 address
    // by default ('0.0.0.0' and '::' respectively).
    server.listen(port, bindaddr)
  } else {
    server.listen(port)
  }

  server.on('error', (error) => {
    if (error.syscall !== 'listen') {
      throw error
    }
    const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port
    // handle specific listen errors with friendly messages
    /* eslint no-fallthrough: ["error", { "commentPattern": "break[\\s\\w]*omitted" }] */
    switch (error.code) {
      // When things are going wrong, do not write to the log file, since it seems
      // that these messages disappear into a black hole rather than go to the log
      // file. Just write to the console for simplicity.
      case 'EACCES':
        console.error(`${bind} requires elevated privileges`)
        process.exit(1)
      // caution: break is omitted intentionally
      case 'EADDRINUSE':
        console.error(`${bind} is already in use`)
        process.exit(1)
      // caution: break is omitted intentionally
      default:
        throw error
    }
  })

  server.on('listening', () => {
    // After successfully binding to the port, switch user/group if possible and
    // if configured to do so (set the group first lest we lose the privilege to
    // change the group after changing the user).
    const svcGroup = settings.get('SVC_GROUP')
    if (svcGroup && process.setgid) {
      process.setgid(svcGroup)
    }
    const svcUser = settings.get('SVC_USER')
    if (svcUser && process.setuid) {
      process.setuid(svcUser)
    }
    const addr = server.address()
    const bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr.port
    // when things are working well, writing to the log is fine
    logger.debug('www: listening on %s', bind)
  })

  // register the listener once each time server is started
  logger.info('www: use `kill -USR2 %s` to reload .env changes', process.pid)
  process.once('SIGUSR2', () => {
    logger.info('www: USR2 signal received, closing server')
    server.close(() => {
      logger.info('www: server closed, restarting momentarily')
      // Invoke later to let the server complete its shutdown before we refresh
      // the enviornment and start another server instance; probably not really
      // necessary but probably safer this way.
      setTimeout(() => {
        refreshEnvironment(process.env).then((envConfig) => {
          logger.info('www: reloaded configuration from .env')
          logEnvironment(envConfig)
          registerLateBindings()
        }).catch((err) => {
          // log the non-fatal error and pretend nothing happened
          logger.error(`www: unable to read .env file: ${err}`)
        }).then(() => startServer())
      }, 0)
    })
  })
}
startServer()

// Register a lightweight usecase that will signal the process to refresh the
// environment on demand, while allowing unit tests to quietly do nothing rather
// than terminating the test runner by sending a "kill" signal.
container.register({
  applyChanges: awilix.asFunction(() => {
    return () => process.kill(process.pid, 'SIGUSR2')
  })
})

// Work-around for bug in winston library in which file transports stop logging
// when an uncaught exception is raised. This work-around also involves removing
// all handleExcpetions options from the logging transport constructors.
//
// c.f. https://github.com/winstonjs/winston/issues/1855
process.on('uncaughtException', (err, origin) => {
  logger.error('www: %s occurred: %s', origin, err)
})

// Catch the unhandled promise rejections and report details.
process.on('unhandledRejection', (reason, promise) => {
  logger.error('www: unhandled rejection at: %s, reason: %s', promise, reason);
});

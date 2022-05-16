#!/usr/bin/env node
//
// Copyright 2022 Perforce Software
//
import app from 'helix-auth-svc/lib/app.js'
import container from 'helix-auth-svc/lib/container.js'
import {
  createServer,
  getPort,
  normalizePort
} from 'helix-auth-svc/lib/server.js'
const logger = container.resolve('logger')
const settings = container.resolve('settingsRepository')

// Get port from environment and store in Express.
const port = normalizePort(getPort(settings))
app.set('port', port)

// Create HTTP/S server.
const server = createServer(app, settings)

// Listen on provided port, on all network interfaces.
const bindaddr = settings.get('BIND_ADDRESS')
if (bindaddr) {
  // Allow explicitly setting the bind address if necessary. According to the
  // Node documentation, it binds to the unspecified IPv4 _and_ IPv6 address by
  // default ('0.0.0.0' and '::' respectively).
  server.listen(port, bindaddr)
} else {
  server.listen(port)
}
server.on('error', onError)
server.on('listening', onListening)

/* eslint no-fallthrough: ["error", { "commentPattern": "break[\\s\\w]*omitted" }] */

// Event listener for HTTP server "error" event.
function onError (error) {
  if (error.syscall !== 'listen') {
    throw error
  }

  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port

  // handle specific listen errors with friendly messages
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
}

// Event listener for HTTP server "listening" event.
function onListening () {
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
  logger.debug('Listening on %s', bind)
}

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

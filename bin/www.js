#!/usr/bin/env node
//
// Copyright 2020-2021 Perforce Software
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
  const addr = server.address()
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port
  // when things are working well, writing to the log is fine
  logger.debug('Listening on %s', bind)
}

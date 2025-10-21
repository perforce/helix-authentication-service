//
// Copyright 2024 Perforce Software
//
import { describe, it, run } from 'mocha'
import { asFunction } from 'awilix'
import request from 'supertest'
// Load the test environment before the bulk of our code initializes, otherwise
// it will be too late due to the `import` early-binding behavior.
import 'helix-auth-svc/test/env.js'
import createApp from 'helix-auth-svc/lib/app.js'
import { createServer } from 'helix-auth-svc/lib/server.js'
import container from 'helix-auth-svc/lib/container.js'
import { RequestError } from 'helix-auth-svc/lib/common/domain/errors/RequestError.js'
import IsReady from 'helix-auth-svc/lib/common/domain/usecases/IsReady.js'

// Tests must be run with `mocha --delay --exit` otherwise we do not give the
// server enough time to start up, and the server hangs indefinitely because
// mocha no longer exits after the tests complete.

const settings = container.resolve('settingsRepository')
const app = await createApp()
const server = createServer(app, settings)
const agent = request.agent(server)
//
// Would have used the ca function but that made no difference,
// still rejected with "Error: self signed certificate" in Node.
//
// const ca = fs.readFileSync('certs/ca.crt')
// const agent = request.agent(server).ca(ca)
// const agent = request.agent(server, { ca })

//
// Give the server a chance to start up asynchronously. This works in concert
// with the --delay flag to the mocha command. A timeout of zero is not quite
// sufficient, so this timing is somewhat fragile.
//
setTimeout(function () {
  describe('Liveness requests', function () {
    it('should indicate error if redis not working', function (done) {
      container.register({
        isReady: asFunction(IsNotReady),
      })
      agent
        .get('/liveness')
        .trustLocalhost(true)
        .expect(500, done)
    })

    it('should indicate success if redis is working', function (done) {
      container.register({
        isReady: asFunction(IsReady),
      })
      agent
        .get('/liveness')
        .trustLocalhost(true)
        .expect(200, done)
    })
  })

  run()
}, 500)

function IsNotReady() {
  return async () => {
    throw new RequestError('oh no', 500)
  }
}

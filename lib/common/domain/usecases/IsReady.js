//
// Copyright 2024 Perforce Software
//
import * as assert from 'node:assert'
import { RequestError } from 'helix-auth-svc/lib/common/domain/errors/RequestError.js'

/**
 * Indicates if the service is basically ready to receive requests.
 *
 * @return true if configured, false if not configured; either case means "ready".
 * @throws {RequestError} if configured and not ready to process requests.
 */
export default ({ redisConnector }) => {
  assert.ok(redisConnector, 'redisConnector must be defined')
  return async () => {
    if (redisConnector) {
      const client = redisConnector.client()
      if (client['ping']) {
        const res = await client.ping('connection test')
        if (res !== 'connection test') {
          throw new RequestError(res, 500)
        }
        return true
      }
    }
    return false
  }
}

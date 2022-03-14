//
// Copyright 2022 Perforce Software
//

/**
 * Error thrown in response to a request that could not be processed
 * successfully. The `code` field is the suggested HTTP response code.
 */
class RequestError extends Error {
  constructor (message, code) {
    super(message)
    this.name = 'RequestError'
    this.code = code
  }
}

export { RequestError }

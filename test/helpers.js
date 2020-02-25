//
// Copyright 2020 Perforce Software
//
const https = require('https')
const { ulid } = require('ulid')

// Retrieve a new request identifier for user authentication.
function getRequestId (hostname, port) {
  // Use a ULID instead of a static value so that we avoid overlapping status
  // requests resulting in "missed notification" style bugs in the tests.
  return new Promise((resolve, reject) => {
    https.get({
      hostname,
      port,
      path: '/requests/new/' + ulid(),
      rejectUnauthorized: false,
      requestCert: false,
      agent: false
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error('invalid status code'))
      }
      if (!res.headers['content-type'].match(/^application\/json/)) {
        reject(new Error('invalid content type'))
      }
      res.setEncoding('utf-8')
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        const json = JSON.parse(data)
        resolve(json.request)
      })
    }).on('error', (err) => {
      reject(err)
    })
  })
}

module.exports = {
  getRequestId
}

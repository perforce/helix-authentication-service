//
// Copyright 2020-2021 Perforce Software
//
import * as https from 'node:https'
import * as xid from 'xid-js';
import { assert } from 'chai'
import p4pkg from 'p4api'
const { P4 } = p4pkg

// Retrieve a new request identifier for user authentication.
export function getRequestId (hostname, port) {
  // use something other than ulid to avoid confusing it with request identifiers
  const userId = xid.next()
  return new Promise((resolve, reject) => {
    https.get({
      hostname,
      port,
      path: '/requests/new/' + userId,
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

export function makeP4 (config) {
  const p4 = new P4({
    P4PORT: config.port,
    P4USER: config.user,
    P4TICKETS: config.tickets,
    P4TRUST: config.trust
  })
  return p4
}

// Search all the things to find a string of output that contains query.
export function findData (command, query) {
  if (command.prompt && typeof command.prompt === 'string') {
    if (command.prompt.includes(query)) {
      return true
    }
  }
  if (command.info && Array.isArray(command.info)) {
    for (const entry of command.info) {
      if (typeof entry.data === 'string' && entry.data.includes(query)) {
        return true
      }
    }
  }
  if (command.error && Array.isArray(command.error)) {
    for (const entry of command.error) {
      if (typeof entry.data === 'string' && entry.data.includes(query)) {
        return true
      }
    }
  }
  return false
}

export function establishTrust (config) {
  const p4 = makeP4(config)
  const trustCmd = p4.cmdSync('trust -y -f')
  const added = trustCmd.data.includes('Added trust for P4PORT')
  const already = trustCmd.data.includes('Trust already established')
  assert.isTrue(added || already)
}

export function establishSuper (config) {
  const p4 = makeP4(config)
  const userOut = p4.cmdSync('user -o')
  const userSpec = userOut.stat[0]
  userSpec.Email = 'bruno@example.com'
  userSpec.FullName = 'Bruno Venus'
  const userIn = p4.cmdSync('user -i', userSpec)
  assert.equal(userIn.info[0].data, 'User bruno saved.')
  const passwdCmd = p4.cmdSync('passwd', 'p8ssword\np8ssword')
  assert.equal(passwdCmd.info[0].data, 'Password updated.')
  const loginCmd = p4.cmdSync('login', 'p8ssword')
  assert.equal(loginCmd.stat[0].TicketExpiration, '43200')
  const configCmd = p4.cmdSync('configure set security=3')
  assert.equal(configCmd.stat[0].Action, 'set')
}

export function establishProtects(config) {
  const p4 = makeP4(config)
  // by default the calling user will be given super protections
  const protectOut = p4.cmdSync('protect -o')
  const protectIn = p4.cmdSync('protect -i', protectOut.stat[0])
  assert.equal(protectIn.info[0].data, 'Protections saved.')
}

export function createUser (user, password, config) {
  const p4 = makeP4(config)
  const userIn = p4.cmdSync('user -i -f', user)
  assert.equal(userIn.info[0].data, `User ${user.User} saved.`)
  const passwdCmd = p4.cmdSync(`passwd ${user.User}`, `${password}\n${password}`)
  assert.equal(passwdCmd.info[0].data, 'Password updated.')
}

export function createGroup (group, config) {
  const p4 = makeP4(config)
  const groupOut = p4.cmdSync(`group -o ${group.Group}`)
  const input = Object.assign({}, groupOut.stat[0], group)
  delete input.code
  const groupIn = p4.cmdSync('group -i', input)
  assert.equal(groupIn.info[0].data, `Group ${group.Group} created.`)
}

export function restartServer (config) {
  // eslint-disable-next-line no-unused-vars
  return new Promise((resolve, reject) => {
    const p4 = makeP4(config)
    p4.cmdSync('admin restart')
    // give the server time to start up again
    setTimeout(resolve, 100)
  })
}

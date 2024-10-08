//
// Copyright 2024 Perforce Software
//
import { assert } from 'chai'
import { describe, it } from 'mocha'
import * as sut from 'helix-auth-svc/lib/server.js'

describe('Server basics', function () {
  describe('getPort', function () {
    it('should default to 3000', function () {
      assert.equal(sut.getPort(new Map()), '3000')
    })

    it('should prefer PORT over SVC_BASE_URI', function () {
      const settings = new Map([
        ['PORT', '3001'],
        ['SVC_BASE_URI', 'http://localhost:3002']
      ])
      assert.equal(sut.getPort(settings), '3001')
    })

    it('should use port in SVC_BASE_URI', function () {
      assert.equal(sut.getPort(new Map([['SVC_BASE_URI', 'http://localhost:3003']])), '3003')
      assert.equal(sut.getPort(new Map([['SVC_BASE_URI', 'https://localhost:3004']])), '3004')
      assert.equal(sut.getPort(new Map([['SVC_BASE_URI', 'http://localhost']])), '80')
      assert.equal(sut.getPort(new Map([['SVC_BASE_URI', 'https://localhost']])), '443')
    })
  })

  describe('normalizePort', function () {
    it('should normalize the port value', function () {
      assert.equal(sut.normalizePort('abc'), 'abc')
      assert.equal(sut.normalizePort('3000'), 3000)
      assert.equal(sut.normalizePort('-8'), false)
    })
  })

  describe('corsConfiguration', function () {
    it('should use SVC_BASE_URI if defined', function () {
      const settings = new Map([
        ['SVC_BASE_URI', 'https://myhost']
      ])
      const expected = {
        origin: 'https://myhost'
      }
      assert.deepEqual(sut.corsConfiguration(settings), expected)
    })

    it('should use CORS_ORIGIN if defined', function () {
      const settings = new Map([
        ['SVC_BASE_URI', 'https://myhost'],
        ['CORS_ORIGIN', '*']
      ])
      assert.deepEqual(sut.corsConfiguration(settings), { origin: '*' })
    })
  })

  describe('getServiceURI', function () {
    it('should use SVC_BASE_URI if defined', function () {
      const settings = new Map([['SVC_BASE_URI', 'https://remotehost:8080']])
      assert.equal(sut.getServiceURI(settings), 'https://remotehost:8080')
      // once more, with trailing slash
      settings.set('SVC_BASE_URI', 'https://remotehost:8080/')
      assert.equal(sut.getServiceURI(settings), 'https://remotehost:8080')
    })

    it('should use PROTOCOL if defined', function () {
      assert.equal(sut.getServiceURI(new Map([['PROTOCOL', 'smtp']])), 'smtp://localhost:3000')
    })

    it('should use PORT if defined', function () {
      assert.equal(sut.getServiceURI(new Map([['PORT', '3001']])), 'http://localhost:3001')
    })

    it('should default to http on localhost port 3000', function () {
      assert.equal(sut.getServiceURI(new Map()), 'http://localhost:3000')
    })
  })
})

//
// Copyright 2021 Perforce Software
//
const { AssertionError } = require('assert')
const express = require('express')
const router = express.Router()
const passport = require('passport')
/* global include */
const Query = include('lib/features/scim/domain/entities/Query')
const NoSuchUserError = include('lib/features/scim/domain/errors/NoSuchUserError')
const UserModel = include('lib/features/scim/data/models/UserModel')
const container = include('lib/container')
const { getServiceURI } = include('lib/server')
const addUser = container.resolve('addUser')
const updateUser = container.resolve('updateUser')
const getUser = container.resolve('getUser')
const getUsers = container.resolve('getUsers')
const patchUser = container.resolve('patchUser')
const removeUser = container.resolve('removeUser')
const logger = container.resolve('logger')
const settings = container.resolve('settingsRepository')

// Check that Accept header has reasonable values, if any.
const ensureAcceptable = (req, res, next) => {
  // enforce data input type as defined in sec. 3.8 of RFC 7644
  if (res.get('Accept')) {
    if (req.accepts(['application/scim+json', 'application/json'])) {
      next()
    } else {
      res.send(406, 'Not Acceptable')
    }
  } else {
    next()
  }
}
router.use(ensureAcceptable)

router.get('/', passport.authenticate('bearer', { session: false }), async (req, res) => {
  const users = await getUsers(new Query(req.query))
  const resources = users.map((e) => e.toJson())
  res.set('Content-Type', 'application/scim+json')
  res.json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: resources.length,
    Resources: resources
  })
})

router.get('/:userId', passport.authenticate('bearer', { session: false }), async (req, res) => {
  try {
    const user = await getUser(req.params.userId)
    if (user) {
      const baseUri = getServiceURI(settings)
      res.set('Content-Type', 'application/scim+json')
      const location = `${baseUri}/scim/v2/Users/${user.username}`
      res.set('Location', location)
      const result = user.toJson()
      result.meta.location = location
      res.status(200).json(result)
    } else {
      res.set('Content-Type', 'application/scim+json')
      res.status(404).json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: `Resource ${req.params.userId} not found`,
        status: '404'
      })
    }
  } catch (err) {
    logger.error('/Users/:userId GET: %s', err)
    res.sendStatus(500)
  }
})

router.post('/', passport.authenticate('bearer', { session: false }), async (req, res) => {
  if (req.is(['application/scim+json', 'application/json'])) {
    try {
      const baseUri = getServiceURI(settings)
      const inputUser = UserModel.fromJson(req.body)
      const foundUser = await getUser(inputUser.username)
      if (foundUser) {
        res.set('Location', `${baseUri}/scim/v2/Users/${foundUser.username}`)
        res.sendStatus(409)
      } else {
        const user = await addUser(inputUser)
        logger.info('Users: added user %s', user.username)
        res.set('Content-Type', 'application/scim+json')
        const location = `${baseUri}/scim/v2/Users/${user.username}`
        res.set('Location', location)
        const result = user.toJson()
        result.meta.location = location
        res.status(201).json(result)
      }
    } catch (err) {
      if (err instanceof AssertionError) {
        res.status(400).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: err.message,
          status: '400'
        })
      } else {
        logger.error('/Users POST: %s', err)
        res.sendStatus(500)
      }
    }
  } else {
    logger.error(`/Users POST: content-type not valid: ${req.get('Content-Type')}`)
    res.status(400).send('Content-Type must be (scim+)json')
  }
})

router.patch('/:userId', passport.authenticate('bearer', { session: false }), async (req, res) => {
  if (req.is(['application/scim+json', 'application/json'])) {
    try {
      const user = await patchUser(req.params.userId, req.body)
      logger.info('Users: patched user %s, active: %s', user.username, req.body.active)
      const baseUri = getServiceURI(settings)
      res.set('Content-Type', 'application/scim+json')
      const location = `${baseUri}/scim/v2/Users/${user.username}`
      res.set('Location', location)
      const result = user.toJson()
      result.meta.location = location
      res.status(200).json(result)
    } catch (err) {
      if (err instanceof NoSuchUserError) {
        res.set('Content-Type', 'application/scim+json')
        res.status(404).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: `Resource ${req.params.userId} not found`,
          status: '404'
        })
      } else {
        logger.error('/Users/:userId PATCH: %s', err)
        res.sendStatus(500)
      }
    }
  } else {
    logger.error(`/Users/:userId PATCH: content-type not valid: ${req.get('Content-Type')}`)
    res.status(400).send('Content-Type must be (scim+)json')
  }
})

router.put('/:userId', passport.authenticate('bearer', { session: false }), async (req, res) => {
  if (req.is(['application/scim+json', 'application/json'])) {
    try {
      logger.info('body: %o', req.body)
      const inputUser = UserModel.fromJson(req.body)
      const user = await updateUser(req.params.userId, inputUser)
      logger.info('Users: updated user %s, active: %s', user.username, req.body.active)
      const baseUri = getServiceURI(settings)
      res.set('Content-Type', 'application/scim+json')
      const location = `${baseUri}/scim/v2/Users/${user.username}`
      res.set('Location', location)
      const result = user.toJson()
      result.meta.location = location
      res.status(200).json(result)
    } catch (err) {
      if (err instanceof NoSuchUserError) {
        res.set('Content-Type', 'application/scim+json')
        res.status(404).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: `Resource ${req.params.userId} not found`,
          status: '404'
        })
      } else {
        logger.error('/Users/:userId PUT: %s', err)
        res.sendStatus(500)
      }
    }
  } else {
    logger.error(`/Users/:userId PUT: content-type not valid: ${req.get('Content-Type')}`)
    res.status(400).send('Content-Type must be (scim+)json')
  }
})

router.delete('/:userId', passport.authenticate('bearer', { session: false }), async (req, res) => {
  try {
    await removeUser(req.params.userId)
    logger.info('Users: removed user %s', req.params.userId)
    res.sendStatus(204)
  } catch (err) {
    logger.error('/Users/:userId DELETE: %s', err)
    res.sendStatus(500)
  }
})

module.exports = router

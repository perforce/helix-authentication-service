//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import express from 'express'
import passport from 'passport'
import { Query } from 'helix-auth-svc/lib/features/scim/domain/entities/Query.js'
import { MutabilityError } from 'helix-auth-svc/lib/features/scim/domain/errors/MutabilityError.js'
import { NoSuchUserError } from 'helix-auth-svc/lib/features/scim/domain/errors/NoSuchUserError.js'
import { UserModel } from 'helix-auth-svc/lib/features/scim/data/models/UserModel.js'
import container from 'helix-auth-svc/lib/container.js'
import { getServiceURI } from 'helix-auth-svc/lib/server.js'
import tokenStrategy from 'helix-auth-svc/lib/features/scim/presentation/strategies/BearerTokenStrategy.js'

const logger = container.resolve('logger')
const scimLogger = container.resolve('scimLogger')
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
const router = express.Router()
router.use(ensureAcceptable)
const getProvisioningDomains = container.resolve('getProvisioningDomains')
passport.use('users', tokenStrategy({ getProvisioningDomains }))

// Ensure the value is an array.
function buildArray(value) {
  if (value === null || value === undefined) {
    return []
  }
  if (Array.isArray(value)) {
    return value
  }
  return [value]
}

router.get('/', passport.authenticate('users', { session: false }), async (req, res) => {
  try {
    const getUsers = container.resolve('getUsers')
    const query = new Query(req.query)
    const excludedAttributes = buildArray(query.excludedAttributes)
    const users = await getUsers(query, req.user.domain)
    const resources = users.map((e) => e.toJson({ excludedAttributes }))
    res.set('Content-Type', 'application/scim+json')
    res.json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: resources.length,
      Resources: resources
    })
  } catch (err) {
    logger.error('/Users GET: %s', err)
    res.set('Content-Type', 'application/scim+json')
    res.status(500).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: err.message,
      status: '500'
    })
  }
})

router.get('/:userId', passport.authenticate('users', { session: false }), async (req, res) => {
  try {
    const getUser = container.resolve('getUser')
    const user = await getUser(req.params.userId, req.user.domain)
    if (user) {
      const baseUri = getServiceURI(settings)
      res.set('Content-Type', 'application/scim+json')
      const location = `${baseUri}/scim/v2/Users/${user.id}`
      res.set('Location', location)
      const excludedAttributes = buildArray(req.query.excludedAttributes)
      const result = user.toJson({ excludedAttributes })
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
    res.set('Content-Type', 'application/scim+json')
    res.status(500).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: err.message,
      status: '500'
    })
  }
})

router.post('/', passport.authenticate('users', { session: false }), async (req, res) => {
  if (req.is(['application/scim+json', 'application/json'])) {
    try {
      if (settings.has('DEBUG_SCIM')) {
        logger.debug('/Users POST: req.body: %o', req.body)
      }
      const baseUri = getServiceURI(settings)
      const inputUser = UserModel.fromJson(req.body)
      const getUser = container.resolve('getUser')
      const foundUser = await getUser(inputUser.username, req.user.domain)
      if (foundUser) {
        res.set('Location', `${baseUri}/scim/v2/Users/${foundUser.id}`)
        res.sendStatus(409)
      } else {
        const addUser = container.resolve('addUser')
        const user = await addUser(inputUser, req.user.domain)
        logger.info('Users: added user %s', user.username)
        res.set('Content-Type', 'application/scim+json')
        const location = `${baseUri}/scim/v2/Users/${user.id}`
        res.set('Location', location)
        const result = user.toJson()
        scimLogger.info('user added', {
          type: 'user', action: 'add', user: result, domain: req.user.domain
        })
        result.meta.location = location
        res.status(201).json(result)
      }
    } catch (err) {
      scimLogger.error('user add failed', {
        type: 'user', action: 'add', body: req.body, error: err.message, domain: req.user.domain
      })
      res.set('Content-Type', 'application/scim+json')
      if (err instanceof AssertionError) {
        res.status(400).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: err.message,
          status: '400'
        })
      } else {
        logger.error('/Users POST: %s', err)
        res.set('Content-Type', 'application/scim+json')
        res.status(500).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: err.message,
          status: '500'
        })
      }
    }
  } else {
    logger.error(`/Users POST: content-type not valid: ${req.get('Content-Type')}`)
    res.status(400).send('Content-Type must be (scim+)json')
  }
})

router.patch('/:userId', passport.authenticate('users', { session: false }), async (req, res) => {
  if (req.is(['application/scim+json', 'application/json'])) {
    try {
      if (settings.has('DEBUG_SCIM')) {
        logger.debug('/Users PATCH: req.body: %o', req.body)
      }
      const patchUser = container.resolve('patchUser')
      const user = await patchUser(req.params.userId, req.body, req.user.domain)
      logger.info('Users: patched user %s, active: %s', user.username, req.body.active)
      scimLogger.info('user patched', {
        type: 'user',
        action: 'patch',
        username: user.username,
        patch: req.body,
        domain: req.user.domain
      })
      const baseUri = getServiceURI(settings)
      res.set('Content-Type', 'application/scim+json')
      const location = `${baseUri}/scim/v2/Users/${user.id}`
      res.set('Location', location)
      const result = user.toJson()
      result.meta.location = location
      res.status(200).json(result)
    } catch (err) {
      scimLogger.error('user patch failed', {
        type: 'user', action: 'patch', body: req.body, error: err.message, domain: req.user.domain
      })
      if (err instanceof MutabilityError) {
        logger.warning('if attempting to rename a user, try setting ALLOW_USER_RENAME=true in the service configuration')
        res.set('Content-Type', 'application/scim+json')
        res.status(400).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: `Cannot change property ${err.field}`,
          scimType: 'mutability',
          status: '400'
        })
      } else if (err instanceof NoSuchUserError) {
        res.set('Content-Type', 'application/scim+json')
        res.status(404).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: `Resource ${req.params.userId} not found`,
          status: '404'
        })
      } else {
        logger.error('/Users/:userId PATCH: %s', err)
        res.set('Content-Type', 'application/scim+json')
        res.status(500).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: err.message,
          status: '500'
        })
      }
    }
  } else {
    logger.error(`/Users/:userId PATCH: content-type not valid: ${req.get('Content-Type')}`)
    res.status(400).send('Content-Type must be (scim+)json')
  }
})

router.put('/:userId', passport.authenticate('users', { session: false }), async (req, res) => {
  if (req.is(['application/scim+json', 'application/json'])) {
    try {
      if (settings.has('DEBUG_SCIM')) {
        logger.debug('/Users PUT: req.body: %o', req.body)
      }
      const inputUser = UserModel.fromJson(req.body)
      const updateUser = container.resolve('updateUser')
      const user = await updateUser(req.params.userId, inputUser, req.user.domain)
      logger.info('Users: updated user %s, active: %s', user.username, req.body.active)
      const baseUri = getServiceURI(settings)
      res.set('Content-Type', 'application/scim+json')
      const location = `${baseUri}/scim/v2/Users/${user.id}`
      res.set('Location', location)
      const result = user.toJson()
      scimLogger.info('user updated', {
        type: 'user', action: 'update', user: result, domain: req.user.domain
      })
      result.meta.location = location
      res.status(200).json(result)
    } catch (err) {
      scimLogger.error('user update failed', {
        type: 'user', action: 'update', body: req.body, error: err.message, domain: req.user.domain
      })
      if (err instanceof MutabilityError) {
        logger.warning('if attempting to rename a user, try setting ALLOW_USER_RENAME=true in the service configuration')
        res.set('Content-Type', 'application/scim+json')
        res.status(400).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: `Cannot change property ${err.field}`,
          scimType: 'mutability',
          status: '400'
        })
      } else if (err instanceof NoSuchUserError) {
        res.set('Content-Type', 'application/scim+json')
        res.status(404).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: `Resource ${req.params.userId} not found`,
          status: '404'
        })
      } else {
        logger.error('/Users/:userId PUT: %s', err)
        res.set('Content-Type', 'application/scim+json')
        res.status(500).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: err.message,
          status: '500'
        })
      }
    }
  } else {
    logger.error(`/Users/:userId PUT: content-type not valid: ${req.get('Content-Type')}`)
    res.status(400).send('Content-Type must be (scim+)json')
  }
})

router.delete('/:userId', passport.authenticate('users', { session: false }), async (req, res) => {
  try {
    const removeUser = container.resolve('removeUser')
    await removeUser(req.params.userId, req.user.domain)
    logger.info('Users: removed user %s', req.params.userId)
    scimLogger.info('user deleted', {
      type: 'user', action: 'delete', userId: req.params.userId, domain: req.user.domain
    })
    res.sendStatus(204)
  } catch (err) {
    scimLogger.error('user delete failed', {
      type: 'user',
      action: 'delete',
      userId: req.params.userId,
      error: err.message,
      domain: req.user.domain
    })
    logger.error('/Users/:userId DELETE: %s', err)
    res.set('Content-Type', 'application/scim+json')
    res.status(500).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: err.message,
      status: '500'
    })
  }
})

export default router

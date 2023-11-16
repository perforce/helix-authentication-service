//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import express from 'express'
import passport from 'passport'
import container from 'helix-auth-svc/lib/container.js'
import { Query } from 'helix-auth-svc/lib/features/scim/domain/entities/Query.js'
import { MutabilityError } from 'helix-auth-svc/lib/features/scim/domain/errors/MutabilityError.js'
import { NoSuchGroupError } from 'helix-auth-svc/lib/features/scim/domain/errors/NoSuchGroupError.js'
import { GroupModel } from 'helix-auth-svc/lib/features/scim/data/models/GroupModel.js'
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
passport.use('groups', tokenStrategy({ getProvisioningDomains }))

function injectMemberRefs(baseUri, group) {
  return group.members.forEach((element) => {
    element.$ref = `${baseUri}/scim/v2/${element.type}s/${element.value}`
  })
}

router.get('/', passport.authenticate('groups', { session: false }), async (req, res) => {
  try {
    const getGroups = container.resolve('getGroups')
    const groups = await getGroups(new Query(req.query), req.user.domain)
    const resources = groups.map((e) => e.toJson())
    res.set('Content-Type', 'application/scim+json')
    res.json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: resources.length,
      Resources: resources
    })
  } catch (err) {
    logger.error('/Groups GET: %s', err)
    res.sendStatus(500)
  }
})

router.get('/:groupId', passport.authenticate('groups', { session: false }), async (req, res) => {
  try {
    const getGroup = container.resolve('getGroup')
    const group = await getGroup(req.params.groupId, req.user.domain)
    if (group) {
      const baseUri = getServiceURI(settings)
      res.set('Content-Type', 'application/scim+json')
      const location = `${baseUri}/scim/v2/Groups/${group.id}`
      res.set('Location', location)
      injectMemberRefs(baseUri, group)
      const result = group.toJson()
      result.meta.location = location
      res.status(200).json(result)
    } else {
      res.set('Content-Type', 'application/scim+json')
      res.status(404).json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: `Resource ${req.params.groupId} not found`,
        status: '404'
      })
    }
  } catch (err) {
    if (err instanceof AssertionError) {
      res.set('Content-Type', 'application/scim+json')
      res.status(400).json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: err.message,
        status: '400'
      })
    } else {
      logger.error('/Groups/:groupId GET: %s', err)
      res.sendStatus(500)
    }
  }
})

router.post('/', passport.authenticate('groups', { session: false }), async (req, res) => {
  if (req.is(['application/scim+json', 'application/json'])) {
    try {
      if (settings.has('DEBUG_SCIM')) {
        logger.debug('/Groups POST: req.body: %o', req.body)
      }
      const baseUri = getServiceURI(settings)
      const inputGroup = GroupModel.fromJson(req.body)
      const getGroup = container.resolve('getGroup')
      const foundGroup = await getGroup(inputGroup.displayName, req.user.domain)
      if (foundGroup) {
        res.set('Location', `${baseUri}/scim/v2/Groups/${foundGroup.id}`)
        res.sendStatus(409)
      } else {
        const addGroup = container.resolve('addGroup')
        const group = await addGroup(inputGroup, req.user.domain)
        logger.info('Groups: added group %s', group.displayName)
        res.set('Content-Type', 'application/scim+json')
        const location = `${baseUri}/scim/v2/Groups/${group.id}`
        res.set('Location', location)
        injectMemberRefs(baseUri, group)
        const result = group.toJson()
        scimLogger.info('group added', {
          type: 'group', action: 'add', group: result, domain: req.user.domain
        })
        result.meta.location = location
        res.status(201).json(result)
      }
    } catch (err) {
      scimLogger.error('group add failed', {
        type: 'group', action: 'add', body: req.body, error: err.message, domain: req.user.domain
      })
      if (err instanceof AssertionError) {
        res.set('Content-Type', 'application/scim+json')
        res.status(400).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: err.message,
          status: '400'
        })
      } else {
        logger.error('/Groups POST: %s', err)
        res.sendStatus(500)
      }
    }
  } else {
    logger.error(`/Groups POST: content-type not valid: ${req.get('Content-Type')}`)
    res.status(400).send('Content-Type must be (scim+)json')
  }
})

router.patch('/:groupId', passport.authenticate('groups', { session: false }), async (req, res) => {
  if (req.is(['application/scim+json', 'application/json'])) {
    try {
      if (settings.has('DEBUG_SCIM')) {
        logger.debug('/Groups PATCH: req.body: %o', req.body)
      }
      const patchGroup = container.resolve('patchGroup')
      const group = await patchGroup(req.params.groupId, req.body, req.user.domain)
      logger.info('Groups: patched group %s', req.params.groupId)
      const baseUri = getServiceURI(settings)
      res.set('Content-Type', 'application/scim+json')
      const location = `${baseUri}/scim/v2/Groups/${group.id}`
      res.set('Location', location)
      injectMemberRefs(baseUri, group)
      const result = group.toJson()
      scimLogger.info('group patched', {
        type: 'group',
        action: 'patch',
        displayName: result.displayName,
        patch: req.body,
        domain: req.user.domain
      })
      result.meta.location = location
      res.status(200).json(result)
    } catch (err) {
      scimLogger.error('group patch failed', {
        type: 'group', action: 'patch', body: req.body, error: err.message, domain: req.user.domain
      })
      if (err instanceof MutabilityError) {
        res.set('Content-Type', 'application/scim+json')
        res.status(400).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: `Cannot change property ${err.field}`,
          scimType: 'mutability',
          status: '400'
        })
      } else if (err instanceof NoSuchGroupError) {
        res.set('Content-Type', 'application/scim+json')
        res.status(404).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: `Resource ${req.params.groupId} not found`,
          status: '404'
        })
      } else {
        logger.error('/Groups/:groupId PATCH: %s', err)
        res.sendStatus(500)
      }
    }
  } else {
    logger.error(`/Groups/:groupId PATCH: content-type not valid: ${req.get('Content-Type')}`)
    res.status(400).send('Content-Type must be (scim+)json')
  }
})

router.put('/:groupId', passport.authenticate('groups', { session: false }), async (req, res) => {
  if (req.is(['application/scim+json', 'application/json'])) {
    try {
      if (settings.has('DEBUG_SCIM')) {
        logger.debug('/Groups PUT: req.body: %o', req.body)
      }
      const inputGroup = GroupModel.fromJson(req.body)
      const updateGroup = container.resolve('updateGroup')
      const group = await updateGroup(req.params.groupId, inputGroup, req.user.domain)
      logger.info('Groups: updated group %s', group.displayName)
      const baseUri = getServiceURI(settings)
      res.set('Content-Type', 'application/scim+json')
      const location = `${baseUri}/scim/v2/Groups/${group.id}`
      res.set('Location', location)
      injectMemberRefs(baseUri, group)
      const result = group.toJson()
      scimLogger.info('group updated', {
        type: 'group', action: 'update', group: result, domain: req.user.domain
      })
      result.meta.location = location
      res.status(200).json(result)
    } catch (err) {
      scimLogger.error('group update failed', {
        type: 'group', action: 'update', body: req.body, error: err.message, domain: req.user.domain
      })
      if (err instanceof MutabilityError) {
        res.set('Content-Type', 'application/scim+json')
        res.status(400).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: `Cannot change property ${err.field}`,
          scimType: 'mutability',
          status: '400'
        })
      } else if (err instanceof NoSuchGroupError) {
        res.set('Content-Type', 'application/scim+json')
        res.status(404).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: `Resource ${req.params.groupId} not found`,
          status: '404'
        })
      } else {
        logger.error('/Groups/:groupId PUT: %s', err)
        res.sendStatus(500)
      }
    }
  } else {
    logger.error(`/Groups/:groupId PUT: content-type not valid: ${req.get('Content-Type')}`)
    res.status(400).send('Content-Type must be (scim+)json')
  }
})

router.delete('/:groupId', passport.authenticate('groups', { session: false }), async (req, res) => {
  try {
    const removeGroup = container.resolve('removeGroup')
    await removeGroup(req.params.groupId, req.user.domain)
    logger.info('Groups: removed group %s', req.params.groupId)
    scimLogger.info('group deleted', {
      type: 'group', action: 'delete', groupId: req.params.groupId, domain: req.user.domain
    })
    res.sendStatus(204)
  } catch (err) {
    scimLogger.error('group delete failed', {
      type: 'group',
      action: 'delete',
      groupId: req.params.groupId,
      error: err.message,
      domain: req.user.domain
    })
    logger.error('/Groups/:groupId DELETE: %s', err)
    res.sendStatus(500)
  }
})

export default router

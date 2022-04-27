//
// Copyright 2022 Perforce Software
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

const addGroup = container.resolve('addGroup')
const getGroup = container.resolve('getGroup')
const getGroups = container.resolve('getGroups')
const patchGroup = container.resolve('patchGroup')
const updateGroup = container.resolve('updateGroup')
const removeGroup = container.resolve('removeGroup')
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
const router = express.Router()
router.use(ensureAcceptable)

function injectMemberRefs (baseUri, group) {
  return group.members.forEach((element) => {
    element.$ref = `${baseUri}/scim/v2/${element.type}s/${element.value}`
  })
}

router.get('/', passport.authenticate('bearer', { session: false }), async (req, res) => {
  try {
    const groups = await getGroups(new Query(req.query))
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

router.get('/:groupId', passport.authenticate('bearer', { session: false }), async (req, res) => {
  try {
    const group = await getGroup(req.params.groupId)
    if (group) {
      const baseUri = getServiceURI(settings)
      res.set('Content-Type', 'application/scim+json')
      const location = `${baseUri}/scim/v2/Groups/${group.displayName}`
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
    logger.error('/Groups/:groupId GET: %s', err)
    res.sendStatus(500)
  }
})

router.post('/', passport.authenticate('bearer', { session: false }), async (req, res) => {
  if (req.is(['application/scim+json', 'application/json'])) {
    try {
      const baseUri = getServiceURI(settings)
      const inputGroup = GroupModel.fromJson(req.body)
      const foundGroup = await getGroup(inputGroup.displayName)
      if (foundGroup) {
        res.set('Location', `${baseUri}/scim/v2/Groups/${foundGroup.username}`)
        res.sendStatus(409)
      } else {
        const group = await addGroup(inputGroup)
        logger.info('Groups: added group %s', group.displayName)
        res.set('Content-Type', 'application/scim+json')
        const location = `${baseUri}/scim/v2/Groups/${group.displayName}`
        res.set('Location', location)
        injectMemberRefs(baseUri, group)
        const result = group.toJson()
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
        logger.error('/Groups POST: %s', err)
        res.sendStatus(500)
      }
    }
  } else {
    logger.error(`/Groups POST: content-type not valid: ${req.get('Content-Type')}`)
    res.status(400).send('Content-Type must be (scim+)json')
  }
})

router.patch('/:groupId', passport.authenticate('bearer', { session: false }), async (req, res) => {
  if (req.is(['application/scim+json', 'application/json'])) {
    try {
      const group = await patchGroup(req.params.groupId, req.body)
      logger.info('Groups: patched group %s', req.params.groupId)
      const baseUri = getServiceURI(settings)
      res.set('Content-Type', 'application/scim+json')
      const location = `${baseUri}/scim/v2/Groups/${group.displayName}`
      res.set('Location', location)
      injectMemberRefs(baseUri, group)
      const result = group.toJson()
      result.meta.location = location
      res.status(200).json(result)
    } catch (err) {
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

router.put('/:groupId', passport.authenticate('bearer', { session: false }), async (req, res) => {
  if (req.is(['application/scim+json', 'application/json'])) {
    try {
      const inputGroup = GroupModel.fromJson(req.body)
      const group = await updateGroup(req.params.groupId, inputGroup)
      logger.info('Groups: updated group %s', group.displayName)
      const baseUri = getServiceURI(settings)
      res.set('Content-Type', 'application/scim+json')
      const location = `${baseUri}/scim/v2/Groups/${group.displayName}`
      res.set('Location', location)
      injectMemberRefs(baseUri, group)
      const result = group.toJson()
      result.meta.location = location
      res.status(200).json(result)
    } catch (err) {
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

router.delete('/:groupId', passport.authenticate('bearer', { session: false }), async (req, res) => {
  try {
    await removeGroup(req.params.groupId)
    logger.info('Groups: removed group %s', req.params.groupId)
    res.sendStatus(204)
  } catch (err) {
    logger.error('/Groups/:groupId DELETE: %s', err)
    res.sendStatus(500)
  }
})

export default router

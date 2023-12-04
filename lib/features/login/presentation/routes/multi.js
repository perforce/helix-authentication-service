//
// Copyright 2023 Perforce Software
//
import express from 'express'
import container from 'helix-auth-svc/lib/container.js'

const router = express.Router()

router.get('/login/:id', async (req, res) => {
  const getAuthProviders = container.resolve('getAuthProviders')
  const providers = await getAuthProviders()
  const reqId = req.params.id
  const insId = req.query.instanceId || 'none'
  const testParam = req.query.test || null
  if (providers.some((e) => e.id)) {
    providers.forEach((e) => {
      e.loginUrl = `/${e.protocol}/login/${reqId}?providerId=${e.id}&instanceId=${insId}`
      if (testParam) {
        e.loginUrl += `&test=${testParam}`
      }
    })
    res.render('choose', { providers })
  } else {
    res.render('error', {
      message: '/multi/login requires AUTH_PROVIDERS setting',
      details: 'Contact the system administrator for help.'
    })
  }
})

export default router

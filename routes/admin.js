//
// Copyright 2022 Perforce Software
//
import express from 'express'
import passport from 'passport'
import LocalStrategy from 'passport-local'
import container from 'helix-auth-svc/lib/container.js'

const logger = container.resolve('logger')
const router = express.Router()

passport.use(new LocalStrategy(
  (username, password, done) => {
    // TODO: compare credentials to local settings
    if (username === 'scott' && password === 'tiger') {
      return done(null, { username })
    } else {
      return done(null, false)
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((obj, done) => {
  done(null, obj)
})

// eslint-disable-next-line no-unused-vars
router.get('/', (req, res, next) => {
  const adminEnabled = process.env.ADMIN_ENABLED
  res.render('admin', { adminEnabled })
})

router.post('/login', passport.authenticate('local', {
  successReturnToOrRedirect: '/admin/edit',
  failureRedirect: '/admin',
  failureMessage: true
}))

function checkAuthentication (req, res, next) {
  if (req.isAuthenticated()) {
    next()
  } else {
    logger.debug('admin: session not authenticated')
    res.redirect('/admin')
  }
}

// eslint-disable-next-line no-unused-vars
router.get('/edit', checkAuthentication, (req, res, next) => {
  // TODO: populate admin_edit form with current values
  res.render('admin_edit')
})

// eslint-disable-next-line no-unused-vars
router.post('/submit', checkAuthentication, (req, res, next) => {
  // TODO: save changes to .env file
  res.render('admin_submit')
})

// eslint-disable-next-line no-unused-vars
router.post('/restart', checkAuthentication, (req, res, next) => {
  // exit and let the process manager restart the application
  logger.info('exiting to let process manager restart the app...')
  process.exit()
})

router.post('/logout', checkAuthentication, (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err)
    }
    res.redirect('/admin')
  })
})

export default router

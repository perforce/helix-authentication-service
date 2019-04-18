//
// Copyright 2019 Perforce Software
//
const express = require('express')
const router = express.Router()
const passport = require('passport')
const Strategy = require('passport-ldapauth')
const { users, requests } = require('../store')

const ldapOptions = {
  url: process.env.LDAP_URL || 'ldap://localhost:389',
  bindDN: process.env.LDAP_BIND_DN || 'cn=super,dc=example,dc=org',
  bindCredentials: process.env.LDAP_BIND_CREDENTIALS || 'secret123',
  searchBase: process.env.LDAP_SEARCH_BASE || 'ou=users,dc=example,dc=org',
  searchFilter: process.env.LDAP_SEARCH_FILTER || '(uid={{username}})'
}
passport.use('ldapauth', new Strategy({
  server: ldapOptions
}, (user, done) => {
  return done(null, user)
}))

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((obj, done) => {
  done(null, obj)
})

router.use(passport.initialize())
router.use(passport.session())

router.get('/login/:id', (req, res, next) => {
  // save the request identifier for request/user mapping
  req.session.requestId = req.params.id
  res.render('login_form', { protocol: 'ldap' })
})

router.post('/validate', passport.authenticate('ldapauth', {
  successRedirect: '/ldap/success',
  failureRedirect: '/ldap/login_failed'
}))

router.get('/login_failed', (req, res, next) => {
  // we need a route that is not the login route lest we end up
  // in a redirect loop when a failure occurs
  res.render('login_failed')
})

function checkAuthentication (req, res, next) {
  if (req.isAuthenticated()) {
    next()
  } else {
    res.redirect('/')
  }
}

router.get('/success', checkAuthentication, (req, res, next) => {
  if (req.session.successRedirect) {
    let path = req.session.successRedirect
    req.session.successRedirect = null
    res.redirect(path)
  } else {
    // req.user: {
    //   dn: 'uid=george,ou=users,dc=example,dc=org',
    //   controls: [],
    //   uid: 'george',
    //   cn: 'Curious George',
    //   sn: 'George',
    //   mail: 'george@example.org',
    //   objectClass: [ 'top', 'person', 'organizationalPerson', 'inetOrgPerson' ],
    //   userPassword: 'seriously?'
    // }
    if (req.user['password']) {
      delete req.user['password']
    }
    if (req.user['userPassword']) {
      delete req.user['userPassword']
    }
    const userId = requests.getIfPresent(req.session.requestId)
    users.set(userId, req.user)
    const name = req.user.given_name || req.user.name || req.user.email
    res.render('details', { name })
  }
})

router.get('/logout', checkAuthentication, (req, res) => {
  req.logout()
  req.session.destroy()
  res.render('logout_success')
})

module.exports = router

//
// Copyright 2020-2021 Perforce Software
//
const fs = require('fs')
const https = require('https')
const querystring = require('querystring')
const { assert } = require('chai')
const { after, before, describe, it } = require('mocha')
const { Builder, By, Capabilities, until } = require('selenium-webdriver')
const { Options } = require('selenium-webdriver/firefox')
const saml2 = require('saml2-js')
const path = require('path')
global.include = (p) => require(path.join(__dirname, '..', p))

//
// Selenium API: https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/
//
// Take a screenshot:
//
// const imagestr = await driver.takeScreenshot()
// fs.writeFileSync('screenshot.png', imagestr, 'base64')
//
// Dumping the page source:
//
// const pageSource = await driver.getPageSource()
// console.info('pageSource:', pageSource)
//

describe('1-step SAML validation', function () {
  let driver
  let loginUrl
  let samlResponse

  before(function () {
    // starting the web driver may take longer than mocha would prefer
    this.timeout(30000)
    const caps = Capabilities.firefox().setAcceptInsecureCerts(true)
    // fyi, going headless makes firefox 10x slower
    const opts = new Options().headless()
    // For the 1-step test, need to control the page flow explicitly so disable
    // the form auto-submit code in the client. Without this, attempting to find
    // and collect page elements will sometimes fail due to the auto-submit code
    // causing a page transition.
    opts.setPreference('javascript.enabled', false)
    driver = new Builder()
      .forBrowser('firefox')
      .withCapabilities(caps)
      .setFirefoxOptions(opts)
      .build()
  })

  after(async function () {
    this.timeout(30000)
    await driver.quit()
  })

  it('should produce a login URL', async function () {
    this.timeout(30000)
    // Prepare the test service provider details to get the login URL using the
    // current docker setup which expects Swarm to be using certain details.
    const spOptions = {
      entity_id: 'urn:swarm-example:sp',
      certificate: fs.readFileSync('test/client.crt', 'utf-8'),
      private_key: fs.readFileSync('test/client.key', 'utf-8'),
      assert_endpoint: 'https://swarm.doc:8043/api/v10/session',
      auth_context: {
        comparison: 'exact',
        class_refs: [
          'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport'
        ]
      },
      nameid_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      sign_get_request: false,
      allow_unencrypted_assertion: true
    }
    const sp = new saml2.ServiceProvider(spOptions)
    const idpOptions = {
      sso_login_url: 'https://authen.doc/saml/login',
      sso_logout_url: 'https://authen.doc/saml/logout',
      certificates: [fs.readFileSync('certs/server.crt', 'utf-8')],
      sign_get_request: false,
      allow_unencrypted_assertion: true
    }
    const idp = new saml2.IdentityProvider(idpOptions)
    // begin the 1-step login process to get the actual login URL
    loginUrl = await new Promise((resolve, reject) => {
      // eslint-disable-next-line no-unused-vars
      sp.create_login_request_url(idp, {}, (err, loginUrl, requestId) => {
        if (err) {
          reject(err)
        } else {
          resolve(loginUrl)
        }
      })
    })
    assert.include(loginUrl, 'authen.doc')
  })

  it('should authenticate via SAML identity provider', async function () {
    this.timeout(30000)
    await driver.get(loginUrl)
    const searchForm = await driver.wait(until.elementLocated(By.css('form')))
    const usernameBox = await searchForm.findElement(By.name('j_username'))
    usernameBox.sendKeys('jackson')
    const passwordBox = await searchForm.findElement(By.name('j_password'))
    passwordBox.sendKeys('Passw0rd!')
    const loginButton = await searchForm.findElement(By.name('_eventId_proceed'))
    await loginButton.click()
    // with JavaScript disabled, shibboleth requires the user to click a button
    const continueButton = await driver.wait(until.elementLocated(By.css('input[type="submit"]')))
    await continueButton.click()
    await driver.wait(until.urlContains('authen.doc'), 10000)
    // extract the SAML response from the form
    const responseForm = await driver.wait(until.elementLocated(By.css('form')))
    const responseInput = await responseForm.findElement(By.name('SAMLResponse'))
    samlResponse = await responseInput.getAttribute('value')
    assert.isNotEmpty(samlResponse)
  })

  it('should validate SAML response via 1-step', async function () {
    // send SAML response to /validate with POST for validation
    const resolved = await new Promise((resolve, reject) => {
      const cert = fs.readFileSync('test/client.crt')
      const key = fs.readFileSync('test/client.key')
      const postData = querystring.stringify({
        SAMLResponse: samlResponse
      })
      const req = https.request({
        hostname: 'authen.doc',
        path: '/saml/validate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        },
        rejectUnauthorized: false,
        requestCert: false,
        agent: false,
        key,
        cert
      }, (res) => {
        assert.equal(res.statusCode, 200)
        assert.match(res.headers['content-type'], /^application\/json/)
        res.setEncoding('utf-8')
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          const json = JSON.parse(data)
          assert.equal(json.nameID, 'saml.jackson@example.com')
          assert.equal(json.nameIDFormat, 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress')
          resolve(true)
        })
      }).on('error', (err) => {
        reject(err)
      })
      req.write(postData)
      req.end()
    })
    assert.isTrue(resolved)
  })
})

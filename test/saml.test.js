//
// Copyright 2020 Perforce Software
//
const fs = require('fs')
const https = require('https')
const { assert } = require('chai')
const { after, before, describe, it } = require('mocha')
const { Builder, By, Capabilities, until } = require('selenium-webdriver')
const { Options } = require('selenium-webdriver/firefox')
const { getRequestId } = require('./helpers')
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

describe('SAML authentication', function () {
  let driver
  let requestId
  let loginUrl

  before(function () {
    // starting the web driver may take longer than mocha would prefer
    this.timeout(30000)
    const caps = Capabilities.firefox().setAcceptInsecureCerts(true)
    // fyi, going headless makes firefox 10x slower
    const opts = new Options().headless()
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

  it('should return a SAML request identifier', async function () {
    requestId = await getRequestId('authen.doc', 443)
    loginUrl = 'https://authen.doc/saml/login/' + requestId
  })

  it('should reject invalid SAML user credentials', async function () {
    // opening the browser (especially headless) can take a long time
    this.timeout(30000)
    await driver.get(loginUrl)
    const searchForm = await driver.wait(until.elementLocated(By.css('form')))
    const usernameBox = await searchForm.findElement(By.name('j_username'))
    usernameBox.sendKeys('jackson')
    const passwordBox = await searchForm.findElement(By.name('j_password'))
    passwordBox.sendKeys('password123')
    // .submit() resulted in "WebDriverError: HTTP method not allowed"
    // await passwordBox.submit()
    const submitButton = await searchForm.findElement(By.name('_eventId_proceed'))
    await submitButton.click()
    const errorElem = await driver.wait(until.elementLocated(
      By.xpath('//p[contains(@class, "form-error")]')), 10000)
    const errorText = await errorElem.getText()
    assert.include(errorText, 'password you entered was incorrect')
  })

  it('should not return SAML login status yet', function (done) {
    this.timeout(30000)
    // This request requires client certificates for security purposes. The
    // supertest module does not allow setting rejectUnauthorized, and as such
    // Node.js rejects the self-signed certificate from a host that is not
    // localhost.
    const cert = fs.readFileSync('test/client.crt')
    const key = fs.readFileSync('test/client.key')
    const req = https.get({
      hostname: 'authen.doc',
      path: `/requests/status/${requestId}`,
      rejectUnauthorized: false,
      requestCert: false,
      agent: false,
      timeout: 15000,
      key,
      cert
    }, (res) => {
      assert.equal(res.statusCode, 200)
    }).on('timeout', () => {
      req.destroy()
      done()
    }).on('error', (err) => {
      if (err.code !== 'ECONNRESET') {
        done(err)
      }
    })
  })

  it('should return a new SAML request identifier', async function () {
    // Start a fresh request because the earlier one is still pending on the
    // server and the data is deleted from the cache in a race condition.
    requestId = await getRequestId('authen.doc', 443)
    loginUrl = 'https://authen.doc/saml/login/' + requestId
  })

  it('should authenticate via SAML identity provider', async function () {
    this.timeout(30000)
    await driver.get(loginUrl)
    const searchForm = await driver.wait(until.elementLocated(By.css('form')))
    const usernameBox = await searchForm.findElement(By.name('j_username'))
    usernameBox.sendKeys('jackson')
    const passwordBox = await searchForm.findElement(By.name('j_password'))
    passwordBox.sendKeys('Passw0rd!')
    // .submit() resulted in "WebDriverError: HTTP method not allowed"
    // await passwordBox.submit()
    const submitButton = await searchForm.findElement(By.name('_eventId_proceed'))
    await submitButton.click()
    await driver.wait(until.urlContains('authen.doc'), 10000)
    const subtitleH2 = await driver.wait(until.elementLocated(By.className('subtitle')))
    const subtitleText = await subtitleH2.getText()
    assert.equal(subtitleText, 'Login Successful')
  })

  it('should return SAML login status of user', function (done) {
    this.timeout(30000)
    const cert = fs.readFileSync('test/client.crt')
    const key = fs.readFileSync('test/client.key')
    https.get({
      hostname: 'authen.doc',
      path: `/requests/status/${requestId}`,
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
        assert.exists(json.sessionIndex)
        done()
      })
    }).on('error', (err) => {
      done(err)
    })
  })

  it('should log out of SAML identity provider', async function () {
    this.timeout(30000)
    await driver.get('https://authen.doc/saml/logout')
    const h1Elem = await driver.wait(until.elementLocated(
      By.xpath('//section[contains(@class, "Site-content")]/div/h1')))
    const h1Text = await h1Elem.getText()
    assert.include(h1Text, 'Logout successful')
  })

  it('should return valid SAML metadata', function (done) {
    https.get({
      hostname: 'authen.doc',
      path: '/saml/metadata',
      rejectUnauthorized: false,
      requestCert: false,
      agent: false
    }, (res) => {
      assert.equal(res.statusCode, 200)
      assert.match(res.headers['content-type'], /^text\/xml/)
      res.setEncoding('utf-8')
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        assert.include(data, '<AssertionConsumerService')
        done()
      })
    }).on('error', (err) => {
      done(err)
    })
  })
})

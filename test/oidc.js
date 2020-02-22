//
// Copyright 2020 Perforce Software
//
const fs = require('fs')
const https = require('https')
const { assert } = require('chai')
const { after, before, describe, it } = require('mocha')
const { Builder, By, Capabilities, until } = require('selenium-webdriver')
const { Options } = require('selenium-webdriver/firefox')

describe('Login', function () {
  let driver

  before(function () {
    // starting the web driver may take longer than mocha would prefer
    this.timeout(10000)
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
    this.timeout(10000)
    await driver.quit()
  })

  describe('authentication via OIDC', function () {
    let requestId
    let loginUrl

    it('should return a request identifier', function (done) {
      https.get({
        hostname: 'auth-svc.doc',
        port: 3000,
        path: '/requests/new/jackson',
        rejectUnauthorized: false,
        requestCert: false,
        agent: false
      }, (res) => {
        assert.equal(res.statusCode, 200)
        assert.match(res.headers['content-type'], /^application\/json/)
        res.setEncoding('utf-8')
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          const json = JSON.parse(data)
          requestId = json.request
          // The docker container for the auth service is configured for saml by
          // default, need to switch to oidc for this test.
          loginUrl = json.loginUrl.replace('/saml/', '/oidc/')
          done()
        })
      }).on('error', (err) => {
        done(err)
      })
    })

    it('should reject invalid user credentials', async function () {
      // opening the browser (especially headless) can take a long time
      this.timeout(20000)
      await driver.get(loginUrl)
      const searchForm = await driver.findElement(By.tagName('form'))
      const usernameBox = await searchForm.findElement(By.name('Username'))
      usernameBox.sendKeys('johndoe')
      const passwordBox = await searchForm.findElement(By.name('Password'))
      passwordBox.sendKeys('password123')
      const loginButton = await searchForm.findElement(By.xpath('//button[@value="login"]'))
      await loginButton.click()
      const errorElem = await driver.wait(until.elementLocated(
        By.xpath('//div[contains(@class, "validation-summary-errors")]/ul/li[1]')), 10000)
      const errorText = await errorElem.getText()
      assert.include(errorText, 'Invalid username or password')
    })

    it('should not return login status yet', function (done) {
      this.timeout(5000)
      // This request requires client certificates for security purposes. The
      // supertest module does not allow setting rejectUnauthorized, and as such
      // Node.js rejects the self-signed certificate from a host that is not
      // localhost.
      const cert = fs.readFileSync('test/client.crt')
      const key = fs.readFileSync('test/client.key')
      const req = https.get({
        hostname: 'auth-svc.doc',
        port: 3000,
        path: `/requests/status/${requestId}`,
        rejectUnauthorized: false,
        requestCert: false,
        agent: false,
        timeout: 3000,
        key,
        cert
      }, (res) => {
        assert.equal(res.statusCode, 200)
      }).on('timeout', () => {
        req.abort()
        done()
      }).on('error', (err) => {
        if (err.code !== 'ECONNRESET') {
          done(err)
        }
      })
    })

    it('should authenticate via identity provider', async function () {
      this.timeout(10000)
      await driver.get(loginUrl)
      const searchForm = await driver.findElement(By.tagName('form'))
      const usernameBox = await searchForm.findElement(By.name('Username'))
      usernameBox.sendKeys('johndoe')
      const passwordBox = await searchForm.findElement(By.name('Password'))
      passwordBox.sendKeys('passw0Rd?')
      const loginButton = await searchForm.findElement(By.xpath('//button[@value="login"]'))
      await loginButton.click()
      await driver.wait(until.urlContains('oidc.doc/consent'), 10000)
      const allowButton = await driver.findElement(
        By.xpath('//div[@class="consent-buttons"]/button[@value="yes"]'))
      await allowButton.click()
      await driver.wait(until.urlContains('auth-svc.doc:3000'), 10000)
      const subtitleH2 = await driver.findElement(By.className('subtitle'))
      const subtitleText = await subtitleH2.getText()
      assert.equal(subtitleText, 'Login Successful')
    })

    it('should return login status of user', function (done) {
      const cert = fs.readFileSync('test/client.crt')
      const key = fs.readFileSync('test/client.key')
      https.get({
        hostname: 'auth-svc.doc',
        port: 3000,
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
          assert.equal(json.email, 'johndoe@example.com')
          assert.equal(json.name, 'John Doe')
          assert.exists(json.sub)
          done()
        })
      }).on('error', (err) => {
        done(err)
      })
    })
  })
})

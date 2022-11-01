//
// Copyright 2020-2021 Perforce Software
//
import * as fs from 'node:fs'
import * as https from 'node:https'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import { Builder, By, Capabilities, until } from 'selenium-webdriver'
import { Options } from 'selenium-webdriver/firefox.js'
import { getRequestId } from 'helix-auth-svc/test/helpers.js'

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

describe('OIDC authentication', function () {
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

  it('should return an OIDC request identifier', async function () {
    requestId = await getRequestId('authen.doc', 443)
    loginUrl = 'https://authen.doc/oidc/login/' + requestId
  })

  it('should reject invalid OIDC user credentials', async function () {
    // opening the browser (especially headless) can take a long time
    this.timeout(30000)
    await driver.get(loginUrl)
    const loginForm = await driver.wait(until.elementLocated(By.css('form')))
    const usernameBox = await loginForm.findElement(By.name('Username'))
    usernameBox.sendKeys('johndoe')
    const passwordBox = await loginForm.findElement(By.name('Password'))
    passwordBox.sendKeys('password123')
    const loginButton = await loginForm.findElement(By.xpath('//button[@value="login"]'))
    await loginButton.click()
    const errorElem = await driver.wait(until.elementLocated(
      By.xpath('//div[contains(@class, "validation-summary-errors")]/ul/li[1]')), 10000)
    const errorText = await errorElem.getText()
    assert.include(errorText, 'Invalid username or password')
  })

  it('should not return OIDC login status yet', function (done) {
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

  it('should return a new OIDC request identifier', async function () {
    // Start a fresh request because the earlier one is still pending on the
    // server and the data is deleted from the cache in a race condition.
    requestId = await getRequestId('authen.doc', 443)
    loginUrl = 'https://authen.doc/oidc/login/' + requestId
  })

  it('should authenticate via OIDC identity provider', async function () {
    this.timeout(30000)
    await driver.get(loginUrl)
    const loginForm = await driver.wait(until.elementLocated(By.css('form')))
    const usernameBox = await loginForm.findElement(By.name('Username'))
    usernameBox.sendKeys('johndoe')
    const passwordBox = await loginForm.findElement(By.name('Password'))
    passwordBox.sendKeys('Passw0rd!')
    const loginButton = await loginForm.findElement(By.xpath('//button[@value="login"]'))
    await loginButton.click()
    try {
      // where did the consent screen go?
      // await driver.wait(until.urlContains('oidc.doc/consent'), 5000)
      // const allowButton = await driver.findElement(
      //   By.xpath('//div[@class="consent-buttons"]/button[@value="yes"]'))
      // await allowButton.click()
      await driver.wait(until.urlContains('authen.doc'), 5000)
    } catch (err) {
      if (err.name === 'TimeoutError') {
        const currentUrl = await driver.getCurrentUrl()
        if (!currentUrl.match(/auth-svc/)) {
          throw err
        }
      } else {
        throw err
      }
    }
    const subtitleH2 = await driver.wait(until.elementLocated(By.className('subtitle')))
    const subtitleText = await subtitleH2.getText()
    assert.equal(subtitleText, 'Login Successful')
  })

  it('should return OIDC login status of user', function (done) {
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
        assert.equal(json.email, 'johndoe@example.com')
        assert.equal(json.name, 'John Doe')
        assert.exists(json.sub)
        done()
      })
    }).on('error', (err) => {
      done(err)
    })
  })

  it('should log out of OIDC identity provider', async function () {
    this.timeout(30000)
    await driver.get('https://authen.doc/oidc/logout')
    const logoutForm = await driver.wait(until.elementLocated(By.css('form')))
    const logoutButton = await logoutForm.findElement(By.css('button'))
    await logoutButton.click()
    const smallElem = await driver.wait(until.elementLocated(By.xpath('//h1/small')))
    const smallText = await smallElem.getText()
    assert.include(smallText, 'You are now logged out')
  })
})

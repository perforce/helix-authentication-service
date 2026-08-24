//
// Copyright 2022 Perforce Software
//
import * as fs from 'node:fs'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { temporaryFile } from 'tempy'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { EnvCredentialsRepository } from 'helix-auth-svc/lib/features/admin/data/repositories/EnvCredentialsRepository.js'
import HashPassword from 'helix-auth-svc/lib/common/domain/usecases/HashPassword.js'
import VerifyPassword from 'helix-auth-svc/lib/common/domain/usecases/VerifyPassword.js'

const hashPassword = HashPassword()
const verifyPassword = VerifyPassword()

describe('env credentials repository', function () {
  it('should raise an error for invalid input', async function () {
    const settings = new MapSettingsRepository()
    settings.set('ADMIN_USERNAME', 'scott')
    settings.set('ADMIN_PASSWD_FILE', '')
    const repository = new EnvCredentialsRepository({ settingsRepository: settings, verifyPassword })
    try {
      await repository.verify(null, 'foobar')
      assert.fail('should have raised Error')
    } catch (err) {
      assert.include(err.message, 'username must be defined')
    }
    try {
      await repository.verify('foobar', null)
      assert.fail('should have raised Error')
    } catch (err) {
      assert.include(err.message, 'password must be defined')
    }
  })

  it('should raise error for missing password file', async function () {
    // arrange
    const settings = new MapSettingsRepository()
    settings.set('ADMIN_USERNAME', 'scott')
    settings.set('ADMIN_PASSWD_FILE', 'doesnotexist')
    const repository = new EnvCredentialsRepository({ settingsRepository: settings, verifyPassword })
    try {
      // act
      await repository.verify('scott', 'tiger')
    } catch (err) {
      // assert
      assert.include(err.code, 'ENOENT')
    }
  })

  it('should return false for non-matching credentials (legacy plaintext)', async function () {
    // arrange
    const passwdFile = temporaryFile({ extension: '.txt' })
    fs.writeFileSync(passwdFile, 'tiger')
    const settings = new MapSettingsRepository()
    settings.set('ADMIN_USERNAME', 'scott')
    settings.set('ADMIN_PASSWD_FILE', passwdFile)
    const repository = new EnvCredentialsRepository({ settingsRepository: settings, verifyPassword })
    // act
    const result = await repository.verify('susan', 'foobar')
    // assert
    assert.isFalse(result)
  })

  it('should return true for matching credentials (legacy plaintext)', async function () {
    // arrange -- a plaintext password file, as written by installations
    // predating HAS-686, must still be accepted
    const passwdFile = temporaryFile({ extension: '.txt' })
    fs.writeFileSync(passwdFile, 'tiger')
    const settings = new MapSettingsRepository()
    settings.set('ADMIN_USERNAME', 'scott')
    settings.set('ADMIN_PASSWD_FILE', passwdFile)
    const repository = new EnvCredentialsRepository({ settingsRepository: settings, verifyPassword })
    // act
    const result = await repository.verify('scott', 'tiger')
    // assert
    assert.isTrue(result)
  })

  it('should return false for non-matching credentials (hashed)', async function () {
    // arrange
    const passwdFile = temporaryFile({ extension: '.txt' })
    fs.writeFileSync(passwdFile, hashPassword('tiger'))
    const settings = new MapSettingsRepository()
    settings.set('ADMIN_USERNAME', 'scott')
    settings.set('ADMIN_PASSWD_FILE', passwdFile)
    const repository = new EnvCredentialsRepository({ settingsRepository: settings, verifyPassword })
    // act
    const result = await repository.verify('scott', 'wrongpass')
    // assert
    assert.isFalse(result)
  })

  it('should return true for matching credentials (hashed)', async function () {
    // arrange -- the format written by HashPassword (HAS-686)
    const passwdFile = temporaryFile({ extension: '.txt' })
    fs.writeFileSync(passwdFile, hashPassword('tiger'))
    const settings = new MapSettingsRepository()
    settings.set('ADMIN_USERNAME', 'scott')
    settings.set('ADMIN_PASSWD_FILE', passwdFile)
    const repository = new EnvCredentialsRepository({ settingsRepository: settings, verifyPassword })
    // act
    const result = await repository.verify('scott', 'tiger')
    // assert
    assert.isTrue(result)
  })
})

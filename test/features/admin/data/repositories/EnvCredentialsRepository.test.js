//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import * as fs from 'node:fs'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { temporaryFile } from 'tempy'
import { EnvCredentialsRepository } from 'helix-auth-svc/lib/features/admin/data/repositories/EnvCredentialsRepository.js'

describe('env credentials repository', function () {
  it('should raise an error for invalid input', function () {
    const repository = new EnvCredentialsRepository({ adminUsername: 'scott', adminPassfile: '' })
    assert.throws(() => repository.verify(null, 'foobar'), AssertionError)
    assert.throws(() => repository.verify('foobar', null), AssertionError)
  })

  it('should raise error for missing password file', async function () {
    // arrange
    const repository = new EnvCredentialsRepository({
      adminUsername: 'scott',
      adminPassfile: 'doesnotexist'
    })
    try {
      // act
      repository.verify('scott', 'tiger')
    } catch (err) {
      // assert
      assert.include(err.code, 'ENOENT')
    }
  })

  it('should return false for non-matching credentials', async function () {
    // arrange
    const passwdFile = temporaryFile({ extension: '.txt' })
    fs.writeFileSync(passwdFile, 'tiger')
    const repository = new EnvCredentialsRepository({
      adminUsername: 'scott',
      adminPassfile: passwdFile
    })
    // act
    const result = repository.verify('susan', 'foobar')
    // assert
    assert.isFalse(result)
  })

  it('should return true for matching credentials', async function () {
    // arrange
    const passwdFile = temporaryFile({ extension: '.txt' })
    fs.writeFileSync(passwdFile, 'tiger')
    const repository = new EnvCredentialsRepository({
      adminUsername: 'scott',
      adminPassfile: passwdFile
    })
    // act
    const result = repository.verify('scott', 'tiger')
    // assert
    assert.isTrue(result)
  })
})

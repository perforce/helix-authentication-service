//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import * as fs from 'node:fs'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { temporaryFile } from 'tempy'
import { DotenvRepository } from 'helix-auth-svc/lib/features/admin/data/repositories/DotenvRepository.js'

describe('dotenv configuration repository', function () {
  it('should raise an error for invalid input', function () {
    const repository = new DotenvRepository({ dotenvFile: '.env' })
    assert.throws(() => repository.write(), AssertionError)
    assert.throws(() => repository.write(null), AssertionError)
  })

  it('should return empty set for missing file', async function () {
    // arrange
    const repository = new DotenvRepository({ dotenvFile: 'nosuchfile.env' })
    // act
    const settings = await repository.read()
    // assert
    assert.isEmpty(settings)
  })

  it('should return empty set for "empty" file', async function () {
    // arrange
    const dotenvFile = temporaryFile({ extension: 'env' })
    fs.writeFileSync(dotenvFile, `# comment line`)
    const repository = new DotenvRepository({ dotenvFile })
    // act
    const settings = await repository.read()
    // assert
    assert.isEmpty(settings)
  })

  it('should return values from dotenv file', async function () {
    // arrange
    const dotenvFile = temporaryFile({ extension: 'env' })
    fs.writeFileSync(dotenvFile, `# comment line
NAME1=VALUE1
NAME2=
name3='value#3'
NAME4="multi
line
value"
name5=\`value5\`
`)
    const repository = new DotenvRepository({ dotenvFile })
    // act
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 5)
    assert.equal(settings.get('NAME1'), 'VALUE1')
    assert.equal(settings.get('NAME2'), '')
    assert.equal(settings.get('name3'), 'value#3')
    assert.equal(settings.get('NAME4'), 'multi\nline\nvalue')
    assert.equal(settings.get('name5'), 'value5')
  })

  it('should write values to dotenv file', async function () {
    // arrange
    const dotenvFile = temporaryFile({ extension: 'env' })
    const repository = new DotenvRepository({ dotenvFile })
    // act
    const incoming = new Map()
    incoming.set('NAME1', 'VALUE1')
    incoming.set('NAME2', '')
    incoming.set('name3', 'value#3')
    incoming.set('NAME4', "multi\nline\nvalue")
    await repository.write(incoming)
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 4)
    assert.equal(settings.get('NAME1'), 'VALUE1')
    assert.equal(settings.get('NAME2'), '')
    assert.equal(settings.get('name3'), 'value#3')
    assert.equal(settings.get('NAME4'), 'multi\nline\nvalue')
  })
})

//
// Copyright 2026 Perforce Software
//
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import {
  compareVersions,
  extractFromTar,
  findChecksum,
  majorOf,
  selectRelease
} from 'helix-auth-svc/bin/upgrade_node.js'

describe('upgrade_node script', function () {
  const index = [
    { version: 'v26.12.1', files: ['linux-arm64', 'linux-x64', 'win-x64-zip'] },
    { version: 'v24.22.1', files: ['linux-arm64', 'linux-x64'] },
    { version: 'v24.9.0', files: ['linux-x64'] },
    { version: 'v24.22.0', files: ['linux-arm64', 'linux-x64'] },
    { version: 'v24.23.0', files: ['win-x64-zip'] },
    { version: 'v22.23.4', files: ['linux-x64'] }
  ]

  it('should compare versions numerically', function () {
    assert.isBelow(compareVersions('v24.9.0', 'v24.22.1'), 0)
    assert.isAbove(compareVersions('v24.22.1', 'v24.22.0'), 0)
    assert.equal(compareVersions('v24.22.1', '24.22.1'), 0)
    assert.isAbove(compareVersions('v26.0.0', 'v24.99.99'), 0)
    assert.equal(majorOf('v24.18.0'), 24)
  })

  it('should select the newest release of the same major version', function () {
    assert.equal(selectRelease(index, { major: 24, arch: 'x64' }), 'v24.22.1')
    assert.equal(selectRelease(index, { major: 22, arch: 'x64' }), 'v22.23.4')
    assert.equal(selectRelease(index, { major: 26, arch: 'arm64' }), 'v26.12.1')
  })

  it('should ignore releases without a build for the platform', function () {
    assert.isNull(selectRelease(index, { major: 22, arch: 'arm64' }))
    assert.isNull(selectRelease(index, { version: 'v24.23.0', arch: 'x64' }))
  })

  it('should select an exact version when requested', function () {
    assert.equal(selectRelease(index, { version: 'v24.22.0', arch: 'x64' }), 'v24.22.0')
    assert.isNull(selectRelease(index, { version: 'v24.1.0', arch: 'x64' }))
  })

  it('should find the checksum for a file', function () {
    const hash1 = 'a'.repeat(64)
    const hash2 = 'b'.repeat(64)
    const shasums = `${hash1}  node-v24.22.1-linux-arm64.tar.gz\n${hash2}  node-v24.22.1-linux-x64.tar.gz\n`
    assert.equal(findChecksum(shasums, 'node-v24.22.1-linux-x64.tar.gz'), hash2)
    assert.isNull(findChecksum(shasums, 'node-v24.22.1-linux-x64.tar.xz'))
    assert.isNull(findChecksum('garbage  node.tar.gz\n', 'node.tar.gz'))
  })

  describe('tar extraction', function () {
    let tmpDir
    let archive
    // a path longer than 100 characters requires an extended header
    const longDir = 'node-v99.0.0-linux-x64/' + 'x'.repeat(120)
    const content = Buffer.from('#!/fake/node binary content\n'.repeat(100))

    before(function () {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upgrade-node-test-'))
      const root = path.join(tmpDir, 'node-v99.0.0-linux-x64')
      fs.mkdirSync(path.join(root, 'bin'), { recursive: true })
      fs.mkdirSync(path.join(tmpDir, longDir), { recursive: true })
      fs.writeFileSync(path.join(root, 'README.md'), 'readme')
      fs.writeFileSync(path.join(tmpDir, longDir, 'node'), 'decoy')
      fs.writeFileSync(path.join(root, 'bin', 'node'), content)
      fs.symlinkSync('node', path.join(root, 'bin', 'nodejs'))
      archive = path.join(tmpDir, 'node.tar.gz')
      execFileSync('tar', ['-czf', archive, '-C', tmpDir, 'node-v99.0.0-linux-x64'])
    })

    after(function () {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    })

    it('should extract the wanted file', async function () {
      const stream = fs.createReadStream(archive).pipe(zlib.createGunzip())
      const data = await extractFromTar(stream, 'node-v99.0.0-linux-x64/bin/node')
      assert.isTrue(content.equals(data))
    })

    it('should extract a file with a long path', async function () {
      const stream = fs.createReadStream(archive).pipe(zlib.createGunzip())
      const data = await extractFromTar(stream, `${longDir}/node`)
      assert.equal(data.toString(), 'decoy')
    })

    it('should return null for a missing file', async function () {
      const stream = fs.createReadStream(archive).pipe(zlib.createGunzip())
      assert.isNull(await extractFromTar(stream, 'node-v99.0.0-linux-x64/bin/npm'))
    })

    it('should not extract a symbolic link', async function () {
      const stream = fs.createReadStream(archive).pipe(zlib.createGunzip())
      assert.isNull(await extractFromTar(stream, 'node-v99.0.0-linux-x64/bin/nodejs'))
    })
  })
})

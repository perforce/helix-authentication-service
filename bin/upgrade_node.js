//
// Copyright 2026 Perforce Software
//
// Upgrade the Node.js binary (bin/node) that is bundled with the Linux
// packages of P4 Authentication Service, then restart the service.
//
// Run this script with the bundled Node.js binary, as root to also restart
// the service (with automatic rollback if it fails to start):
//
//   sudo /opt/perforce/helix-auth-svc/bin/node /opt/perforce/helix-auth-svc/bin/upgrade_node.js
//
// or as the account that owns the installation, which replaces bin/node
// and leaves restarting the service to the administrator:
//
//   sudo -u p4auth /opt/perforce/helix-auth-svc/bin/node /opt/perforce/helix-auth-svc/bin/upgrade_node.js
//
// By default the latest release of the same major version as the current
// bin/node is installed, since a new major version may break third-party
// modules. Use --major to deliberately move to a different major version.
//
// This script must only use Node.js built-in modules so that it can be
// copied into any existing installation and run with the bundled binary.
//
import { execFileSync, spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import zlib from 'node:zlib'

const DEFAULT_DIST_URL = 'https://nodejs.org/dist'
const SERVICE_NAME = 'helix-auth.service'
const ARCH_MAP = { x64: 'x64', arm64: 'arm64' }

const USAGE = `Usage: bin/node bin/upgrade_node.js [options]

Upgrade the Node.js binary (bin/node) bundled with P4 Authentication Service
to the latest release of the same major version, then restart the service.
Run with the bundled Node.js binary, either as root, or as the account that
owns the installation (in which case the service is not restarted).

Options:
  --check              Report the current and latest versions, change nothing.
  --major <N>          Install the latest release of major version N instead
                       of the current major version.
  --version <vX.Y.Z>   Install this exact version.
  --dist-url <URL>     Download from this mirror of ${DEFAULT_DIST_URL}.
  --no-restart         Replace bin/node but do not restart the service.
  --force              Reinstall or downgrade if the version is not newer.
  -h, --help           Show this help and exit.

When run as root, if the service does not come back up after the restart,
the previous binary is restored and the service is restarted again.

Proxy settings in HTTPS_PROXY/HTTP_PROXY/NO_PROXY are honored.
`

// Compare two version strings (vX.Y.Z), returning <0, 0, or >0.
export function compareVersions (a, b) {
  const pa = a.replace(/^v/, '').split('.').map(Number)
  const pb = b.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0)
    if (diff !== 0) {
      return diff
    }
  }
  return 0
}

// Return the major version number of a version string (vX.Y.Z).
export function majorOf (version) {
  return Number(version.replace(/^v/, '').split('.')[0])
}

// Choose a release from the parsed dist/index.json content. When version is
// given, select exactly that release; otherwise select the newest release of
// the given major version. Only releases with a build for linux-<arch> are
// considered. Returns the version string, or null if nothing matches.
export function selectRelease (index, { major, version, arch }) {
  const platform = `linux-${arch}`
  const candidates = index.filter((r) => {
    if (!Array.isArray(r.files) || !r.files.includes(platform)) {
      return false
    }
    if (version) {
      return r.version === version
    }
    return majorOf(r.version) === major
  })
  if (candidates.length === 0) {
    return null
  }
  candidates.sort((a, b) => compareVersions(b.version, a.version))
  return candidates[0].version
}

// Find the SHA-256 checksum for the named file in SHASUMS256.txt content.
export function findChecksum (shasums, filename) {
  for (const line of shasums.split('\n')) {
    const [hash, name] = line.trim().split(/\s+/)
    if (name === filename && /^[0-9a-f]{64}$/.test(hash)) {
      return hash
    }
  }
  return null
}

// Read a NUL-terminated string from a tar header field.
function headerString (header, start, length) {
  const raw = header.toString('utf8', start, start + length)
  const nul = raw.indexOf('\0')
  return nul === -1 ? raw : raw.slice(0, nul)
}

// Extract the path from the content of a pax extended header, if present.
function paxPath (data) {
  let offset = 0
  while (offset < data.length) {
    const space = data.indexOf(0x20, offset)
    if (space === -1) {
      break
    }
    const length = Number(data.toString('utf8', offset, space))
    if (!length) {
      break
    }
    const record = data.toString('utf8', space + 1, offset + length - 1)
    if (record.startsWith('path=')) {
      return record.slice(5)
    }
    offset += length
  }
  return null
}

// Read a (decompressed) tar stream and return the contents of the regular
// file whose path matches wanted, or null if it is not in the archive.
export async function extractFromTar (readable, wanted) {
  let pending = Buffer.alloc(0)
  let state = 'header'
  let remaining = 0
  let padding = 0
  let kind = 'skip'
  let chunks = []
  let nextName = null
  for await (const chunk of readable) {
    pending = pending.length ? Buffer.concat([pending, chunk]) : chunk
    for (;;) {
      if (state === 'header') {
        if (pending.length < 512) {
          break
        }
        const header = pending.subarray(0, 512)
        pending = pending.subarray(512)
        if (header.every((b) => b === 0)) {
          continue
        }
        const name = headerString(header, 0, 100)
        const prefix = headerString(header, 345, 155)
        const size = parseInt(headerString(header, 124, 12).trim() || '0', 8)
        const type = String.fromCharCode(header[156])
        const fullName = nextName || (prefix ? `${prefix}/${name}` : name)
        remaining = size
        padding = (512 - (size % 512)) % 512
        chunks = []
        if (type === 'x' || type === 'L') {
          kind = type
        } else {
          nextName = null
          const regular = type === '0' || type === '\0'
          kind = regular && fullName.replace(/^\.\//, '') === wanted ? 'want' : 'skip'
        }
        state = 'data'
      }
      if (state === 'data') {
        const count = Math.min(remaining, pending.length)
        if (kind !== 'skip') {
          chunks.push(pending.subarray(0, count))
        }
        pending = pending.subarray(count)
        remaining -= count
        if (remaining > 0) {
          break
        }
        state = 'padding'
      }
      if (state === 'padding') {
        const count = Math.min(padding, pending.length)
        pending = pending.subarray(count)
        padding -= count
        if (padding > 0) {
          break
        }
        if (kind === 'want') {
          return Buffer.concat(chunks)
        } else if (kind === 'x') {
          nextName = paxPath(Buffer.concat(chunks)) || nextName
        } else if (kind === 'L') {
          nextName = headerString(Buffer.concat(chunks), 0, Infinity)
        }
        state = 'header'
      }
    }
  }
  return null
}

function info (msg) {
  console.info(msg)
}

// Describe an error, including the underlying cause of a failed fetch.
function describe (err) {
  return err.cause && err.cause.message ? `${err.message}: ${err.cause.message}` : err.message
}

function fatal (msg) {
  console.error(`error: ${msg}`)
  process.exit(1)
}

async function fetchText (url) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`GET ${url} returned HTTP ${res.status}`)
  }
  return res.text()
}

// Download url to the file at dest, returning the SHA-256 of the content.
async function download (url, dest) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`GET ${url} returned HTTP ${res.status}`)
  }
  const hash = crypto.createHash('sha256')
  const hasher = new Transform({
    transform (chunk, encoding, callback) {
      hash.update(chunk)
      callback(null, chunk)
    }
  })
  await pipeline(Readable.fromWeb(res.body), hasher, fs.createWriteStream(dest))
  return hash.digest('hex')
}

function run (cmd, args) {
  return spawnSync(cmd, args, { encoding: 'utf8' })
}

function nodeVersionOf (binary) {
  return execFileSync(binary, ['--version'], { encoding: 'utf8' }).trim()
}

// Return the properties of the systemd service unit, or null if systemd or
// the unit are not available.
function serviceProperties () {
  const result = run('systemctl', ['show', SERVICE_NAME, '-p', 'LoadState,ExecStart,ActiveState,MainPID'])
  if (result.error || result.status !== 0) {
    return null
  }
  const props = {}
  for (const line of result.stdout.split('\n')) {
    const eq = line.indexOf('=')
    if (eq > 0) {
      props[line.slice(0, eq)] = line.slice(eq + 1)
    }
  }
  return props.LoadState === 'loaded' ? props : null
}

// Restart the service and wait for it to stay running. Returns true if the
// service is active and its main process has not changed for a few seconds.
async function restartService () {
  const result = run('systemctl', ['restart', SERVICE_NAME])
  if (result.status !== 0) {
    console.error(result.stderr.trim())
    return false
  }
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  let lastPid = null
  let stableSince = null
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    await sleep(1000)
    const props = serviceProperties()
    if (props && props.ActiveState === 'active' && props.MainPID !== '0') {
      if (props.MainPID === lastPid) {
        if (Date.now() - stableSince >= 5000) {
          return true
        }
      } else {
        lastPid = props.MainPID
        stableSince = Date.now()
      }
    } else {
      lastPid = null
    }
  }
  return false
}

// Copy the owner, group, and mode of reference to target.
function matchOwnership (reference, target) {
  const stat = fs.statSync(reference)
  fs.chownSync(target, stat.uid, stat.gid)
  fs.chmodSync(target, stat.mode & 0o7777)
  // restore the default SELinux context, where applicable
  run('restorecon', [target])
}

// Remove the backups made by earlier runs, keeping only the latest one, since
// each Node.js binary is over 100 MB.
function removeOldBackups (binDir, keep) {
  for (const name of fs.readdirSync(binDir)) {
    const full = path.join(binDir, name)
    if (/^node\.v\d+\.\d+\.\d+$/.test(name) && full !== keep) {
      fs.rmSync(full, { force: true })
      info(`Removed old backup ${full}`)
    }
  }
}

async function main () {
  let parsed
  try {
    parsed = parseArgs({
      options: {
        check: { type: 'boolean', default: false },
        major: { type: 'string' },
        version: { type: 'string' },
        'dist-url': { type: 'string', default: DEFAULT_DIST_URL },
        'no-restart': { type: 'boolean', default: false },
        force: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false }
      }
    })
  } catch (err) {
    console.error(err.message)
    console.error(USAGE)
    process.exit(1)
  }
  const opts = parsed.values
  if (opts.help) {
    console.info(USAGE)
    return
  }
  if (opts.major && opts.version) {
    fatal('use either --major or --version, not both')
  }
  if (process.platform !== 'linux') {
    fatal('this script supports only the Linux packages of P4 Authentication Service')
  }
  const arch = ARCH_MAP[process.arch]
  if (!arch) {
    fatal(`unsupported architecture: ${process.arch}`)
  }

  const binDir = path.dirname(fs.realpathSync(fileURLToPath(import.meta.url)))
  const nodePath = path.join(binDir, 'node')
  if (!fs.existsSync(path.join(binDir, 'www.js')) || !fs.existsSync(nodePath)) {
    fatal(`${binDir} does not contain www.js and node; is this a package installation?`)
  }
  const current = nodeVersionOf(nodePath)
  const distUrl = opts['dist-url'].replace(/\/+$/, '')

  let wanted = { arch, major: majorOf(current) }
  if (opts.version) {
    const version = opts.version.startsWith('v') ? opts.version : `v${opts.version}`
    if (!/^v\d+\.\d+\.\d+$/.test(version)) {
      fatal(`invalid version: ${opts.version}`)
    }
    wanted = { arch, version }
  } else if (opts.major) {
    if (!/^\d+$/.test(opts.major)) {
      fatal(`invalid major version: ${opts.major}`)
    }
    wanted = { arch, major: Number(opts.major) }
  }

  const index = JSON.parse(await fetchText(`${distUrl}/index.json`))
  const target = selectRelease(index, wanted)
  if (!target) {
    const what = wanted.version || `v${wanted.major}.x`
    fatal(`no Node.js release ${what} found for linux-${arch} at ${distUrl}`)
  }
  info(`Installed Node.js: ${current}`)
  info(`Selected Node.js:  ${target}`)
  if (opts.check) {
    return
  }
  if (compareVersions(target, current) <= 0 && !opts.force) {
    info('Nothing to do; use --force to install the selected version anyway.')
    return
  }
  if (majorOf(target) !== majorOf(current)) {
    info(`warning: changing major version from ${majorOf(current)} to ${majorOf(target)}`)
  }
  try {
    fs.accessSync(binDir, fs.constants.W_OK)
  } catch {
    fatal(`cannot write to ${binDir}; run as root or as the owner of ${binDir}`)
  }
  const isRoot = process.getuid() === 0
  const restart = !opts['no-restart'] && isRoot
  const service = restart ? serviceProperties() : null

  // download and verify the release tarball
  const tarName = `node-${target}-linux-${arch}.tar.gz`
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upgrade-node-'))
  const stagedPath = path.join(binDir, `node.new-${target}`)
  try {
    const shasums = await fetchText(`${distUrl}/${target}/SHASUMS256.txt`)
    const expected = findChecksum(shasums, tarName)
    if (!expected) {
      throw new Error(`no checksum for ${tarName} in SHASUMS256.txt`)
    }
    const tarPath = path.join(tmpDir, tarName)
    info(`Downloading ${distUrl}/${target}/${tarName}`)
    const actual = await download(`${distUrl}/${target}/${tarName}`, tarPath)
    if (actual !== expected) {
      throw new Error(`checksum mismatch for ${tarName}: expected ${expected}, got ${actual}`)
    }
    info('Checksum verified.')

    // extract bin/node into the bin directory (same file system, so the
    // final rename is atomic and the binary is not on a noexec /tmp)
    const member = `node-${target}-linux-${arch}/bin/node`
    const binary = await extractFromTar(
      fs.createReadStream(tarPath).pipe(zlib.createGunzip()), member)
    if (!binary) {
      throw new Error(`${member} not found in ${tarName}`)
    }
    fs.writeFileSync(stagedPath, binary, { mode: 0o755 })
  } catch (err) {
    fs.rmSync(stagedPath, { force: true })
    throw err
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
  let staged
  try {
    matchOwnership(nodePath, stagedPath)
    staged = nodeVersionOf(stagedPath)
  } catch (err) {
    fs.rmSync(stagedPath, { force: true })
    fatal(`unable to run the downloaded binary: ${err.message}`)
  }
  if (staged !== target) {
    fs.rmSync(stagedPath, { force: true })
    fatal(`downloaded binary reports ${staged}, expected ${target}`)
  }

  // move the old binary aside and put the new one in place
  const backupPath = path.join(binDir, `node.${current}`)
  fs.renameSync(nodePath, backupPath)
  fs.renameSync(stagedPath, nodePath)
  info(`Replaced bin/node (${current} saved as ${backupPath})`)

  if (!restart) {
    info(isRoot ? 'Not restarting the service (--no-restart).' : 'Not running as root, so not restarting the service.')
    info(`Restart the service to use ${target}, for example: sudo systemctl restart ${SERVICE_NAME}`)
  } else if (!service) {
    info(`The ${SERVICE_NAME} systemd unit was not found; restart the service manually.`)
  } else if (!service.ExecStart.includes(nodePath)) {
    info(`The ${SERVICE_NAME} unit does not run ${nodePath}; not restarting it.`)
  } else if (service.ActiveState !== 'active') {
    info(`The ${SERVICE_NAME} unit is not running; it will use ${target} when started.`)
  } else {
    info(`Restarting ${SERVICE_NAME}...`)
    if (await restartService()) {
      info(`The service is running with Node.js ${target}.`)
    } else {
      console.error(`error: ${SERVICE_NAME} did not stay running; restoring ${current}`)
      fs.renameSync(backupPath, nodePath)
      const recovered = await restartService()
      console.error(recovered
        ? `The service is running again with Node.js ${current}.`
        : `The service is still not running; check: journalctl -u ${SERVICE_NAME}`)
      process.exit(1)
    }
  }
  removeOldBackups(binDir, backupPath)
  info(`To revert, restore ${backupPath} as ${nodePath} and restart the service.`)
}

// Re-run with proxy support enabled when proxy settings are present, since
// the built-in fetch only honors them when NODE_USE_ENV_PROXY is set.
function proxyReexec () {
  const env = process.env
  const proxy = env.HTTPS_PROXY || env.https_proxy || env.HTTP_PROXY || env.http_proxy
  if (proxy && !env.NODE_USE_ENV_PROXY) {
    const result = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
      stdio: 'inherit',
      env: { ...env, NODE_USE_ENV_PROXY: '1' }
    })
    process.exit(result.status ?? 1)
  }
}

const invoked = process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
if (invoked) {
  proxyReexec()
  main().catch((err) => fatal(describe(err)))
}

//
// Copyright 2020-2021 Perforce Software
//
import * as path from 'node:path'
import { Service } from 'node-windows'
import { fileURLToPath } from 'node:url'

const bindir = path.dirname(fileURLToPath(import.meta.url))
const scriptPath = path.join(bindir, 'www.js')
const svc = new Service({
  name: 'Helix Authentication',
  description: 'P4 Authentication Service',
  script: scriptPath,
  workingDirectory: path.dirname(bindir)
})
svc.on('alreadyinstalled', () => {
  console.info('Service already installed')
})
svc.on('invalidinstallation', () => {
  console.info('Invalid installation (missing files?)')
})
svc.on('error', (err) => {
  console.error('An error occurred:', err)
})
svc.on('install', () => {
  svc.start()
})
svc.install()

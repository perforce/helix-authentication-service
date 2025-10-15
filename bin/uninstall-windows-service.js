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
  script: scriptPath
})
svc.on('alreadyuninstalled', () => {
  console.info('Service already un-installed')
})
svc.on('error', (err) => {
  console.error('An error occurred:', err)
})
svc.on('uninstall', () => {
  console.info('Service removed')
})
svc.uninstall()

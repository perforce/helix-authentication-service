//
// Copyright 2020 Perforce Software
//
const path = require('path')
const Service = require('node-windows').Service

const scriptPath = path.join(__dirname, 'www')
const svc = new Service({
  name: 'Helix Authentication',
  description: 'Helix Authentication Service',
  script: scriptPath,
  workingDirectory: path.dirname(__dirname)
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

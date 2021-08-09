//
// Copyright 2020-2021 Perforce Software
//
const path = require('path')
const Service = require('node-windows').Service

const scriptPath = path.join(__dirname, 'www')
const svc = new Service({
  name: 'Helix Authentication',
  description: 'Helix Authentication Service',
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

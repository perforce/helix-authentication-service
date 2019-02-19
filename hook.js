//
// Scripted development cycle for the extension. This is a Node script for
// several reasons: it will work on macOS, Linux, and Windows; Node is already
// installed; shell is a very blunt instrument.
//
const { exec, spawn } = require('child_process')
const fs = require('fs')

const p4user = 'super'
const p4port = 'p4d.doc:1666'
const p4cmd = `p4 -u ${p4user} -p ${p4port}`
const hookname = 'Auth::loginhook'
const hookpath = 'loginhook'
const filename = 'loginhook.p4-extension'
const confname = 'loginhook-all'
const loginmsg = 'Please authenticate using your web browser.'

if (fs.existsSync(filename)) {
  fs.unlinkSync(filename)
}

new Promise((resolve, reject) => {
  exec(`${p4cmd} extension --package ${hookpath}`, (error, stdout, stderr) => {
    if (error) {
      reject(error)
    } else {
      console.info('Package built...')
      resolve()
    }
  })
}).then(() => {
  return new Promise((resolve, reject) => {
    exec(`${p4cmd} extension --list --type=extensions`, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      } else {
        resolve(stdout.includes(hookname))
      }
    })
  })
}).then((installed) => {
  if (installed) {
    return new Promise((resolve, reject) => {
      exec(`${p4cmd} extension --delete ${hookname} --yes`, (error, stdout, stderr) => {
        if (error) {
          reject(error)
        } else {
          console.info('Previously installed extension removed...')
          resolve()
        }
      })
    })
  } else {
    return Promise.resolve()
  }
}).then(() => {
  return new Promise((resolve, reject) => {
    exec(`${p4cmd} extension --install ${filename}`, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      } else {
        console.info('New package installed...')
        resolve()
      }
    })
  })
}).then(() => {
  return new Promise((resolve, reject) => {
    exec(`${p4cmd} extension --configure ${hookname} -o`, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      } else {
        resolve(stdout)
      }
    })
  })
}).then((config) => {
  config = config.replace(/sampleExtensionsUser/g, 'super')
  config = config.replace(/http:\/\/localhost:3000/, 'http://svc.doc:3000')
  return new Promise((resolve, reject) => {
    let child = spawn('p4', ['-u', p4user, '-p', p4port, 'extension', '--configure', hookname, '-i'])
    child.stdout.on('data', (data) => {
      console.info(data.toString())
    })
    child.stderr.on('data', (data) => {
      console.error(`p4 stderr: ${data}`)
    })
    child.stdin.write(config)
    child.stdin.end()
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`child exited: ${code}`))
      } else {
        resolve()
      }
    })
  })
}).then(() => {
  return new Promise((resolve, reject) => {
    exec(`${p4cmd} extension --configure ${hookname} --name ${confname} -o`, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      } else {
        resolve(stdout)
      }
    })
  })
}).then((config) => {
  config = config.replace(/message:[^]*\.$/m, 'message:\n\t\t' + loginmsg)
  return new Promise((resolve, reject) => {
    let child = spawn('p4', ['-u', p4user, '-p', p4port, 'extension', '--configure', hookname, '-i'])
    child.stdout.on('data', (data) => {
      console.info(data.toString())
    })
    child.stderr.on('data', (data) => {
      console.error(`p4 stderr: ${data}`)
    })
    child.stdin.write(config)
    child.stdin.end()
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`child exited: ${code}`))
      } else {
        console.info('p4d restarted')
        resolve()
      }
    })
  })
}).then(() => {
  // restart p4d so the authentication changes take effect
  return new Promise((resolve, reject) => {
    exec(`${p4cmd} admin restart`, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}).catch((err) => {
  console.error(err)
})

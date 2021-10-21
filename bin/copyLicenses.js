//
// For each production module, find its license file and copy it into the
// 'docs/licenses' directory for distribution. Only considers those packages
// that are direct dependencies of this module.
//
import * as checker from 'license-checker'
import * as fs from 'node:fs'
import * as path from 'node:path'

// collect our direct dependencies into a unique set of package names
const packageJson = JSON.parse(fs.readFileSync('package.json'))

const directPackages = new Set()
for (const pkg in packageJson.dependencies) {
  directPackages.add(pkg)
}

// use the license-checker to gather all of the available data
checker.init({
  start: '.'
}, function (err, packages) {
  if (err) {
    console.error(err)
  } else {
    for (const p in packages) {
      let pkgName = p.replace(/@.*/, '')
      if (pkgName === '') {
        pkgName = p.substring(1).replace(/@.*/, '')
      }
      if (directPackages.has(pkgName)) {
        // The same package may appear more than once, with different versions.
        // Only one will be considered, and it is likely the oldest version. In
        // practice it should not matter all that much.
        directPackages.delete(pkgName)
        const licenseFile = packages[p].licenseFile
        if (licenseFile) {
          const leaf = path.basename(licenseFile)
          const dir = path.basename(path.dirname(licenseFile))
          const dest = 'docs/licenses/' + dir + '/' + leaf
          if (!fs.existsSync(path.dirname(dest))) {
            fs.mkdirSync(path.dirname(dest), { recursive: true, mode: 0o755 })
          }
          if (fs.existsSync(path)) {
            fs.unlinkSync(path)
          }
          const data = fs.readFileSync(licenseFile, 'utf8')
          fs.appendFileSync(dest, data, 'utf8', '0o644', 'a')
        }
      }
    }
  }
})

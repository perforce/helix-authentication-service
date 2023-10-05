//
// Default logging configuration file for Helix Authentication Service.
//
// See the setting named LOGGING and the Logging section in the documentation
// https://www.perforce.com/manuals/helix-auth-svc/Content/HAS/configuring-has.html
// for more information.
//
module.exports = {
  level: 'info',
  transport: 'file',
  file: {
    filename: 'auth-svc.log',
    maxsize: 1048576,
    maxfiles: 4
  }
}

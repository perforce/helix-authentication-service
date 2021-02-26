//
// Default logging configuration file for Helix Authentication Service.
//
// See the service documentation for details on the various settings, including
// configuration specific to the available transports.
//
module.exports = {
  level: 'debug',
  transport: 'file',
  file: {
    filename: 'auth-svc.log',
    maxsize: 1048576,
    maxfiles: 4
  }
}

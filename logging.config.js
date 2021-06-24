//
// Default logging configuration file for Helix Authentication Service.
//
// See https://www.perforce.com/manuals/helix-auth-svc/ for documentation on the
// available settings, including configuration specific to the log transports.
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

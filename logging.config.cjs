//
// Default logging configuration file for P4 Authentication Service.
//
// See the setting named LOGGING and the Logging section in the documentation
// https://help.perforce.com/helix-core/integrations-plugins/helix-auth-svc/current/Content/HAS/Home-has.html
// for more information.
//
module.exports = {
  level: 'info',
  transport: 'file',
  file: {
    filename: 'auth-svc.log',
    maxsize: 1048576,
    maxfiles: 4
  },
  // User-provisioning specific logging; features are identical to the top-level
  // logging configuration, but contained within a property named 'scim' so that
  // it may be configured appropriately.
  scim: {
    level: 'info',
    transport: 'file',
    format: 'json',
    file: {
      filename: 'provisioning.log',
      maxsize: 1048576,
      maxfiles: 4
    },
  }
}

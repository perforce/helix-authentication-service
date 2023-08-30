//
// Authentication service SAML IdP configuration file.
//
// For information regarding the configuration of HAS for use with Swarm, see
// https://www.perforce.com/manuals/helix-auth-svc/Content/HAS/example-swarm-config.html
//

//
// Define the configuration of the SAML identity provider implementation
// in this authentication service. That is, how this service will act as
// an identity provider to SAML clients, in particular Perforce Swarm.
//
module.exports = {
  //
  // The top-level property names are the SP entity identifiers, and the value
  // defines one or more properties associated with that service provider.
  //
  // The acsUrl property defines the corresponding assertion consumer service
  // (ACS) URL for the SP.
  //
  // These are examples, be sure to replace them with real values.
  //
  'urn:swarm-example:sp': {
    acsUrl: 'https://swarm.example.com/api/v10/session'
  },
  'urn:swarm-2019.3:sp': {
    acsUrl: 'https://swarm.example.com/login'
  },
  'http://hth.example.com/account/saml/hth/metadata': {
    acsUrl: 'https://hth.example.com/account/saml/hth/consume'
  },
  //
  // The top-level property name can contain wildcards (* and ?), in which case
  // the minimatch library will be used to match against the audience provided
  // by the service provider. c.f. https://github.com/isaacs/minimatch
  //
  'urn:swarm-201?.*:sp': {
    acsUrl: 'https://swarm.example.com/login'
  },
  //
  // Support for Swarm installations configured to connect with multiple Helix
  // Core Server instances is shown below, in the form of two settings named
  // `acsUrls` and `acsUrlRe`, which take the place of `acsUrl`.
  //
  'urn:swarm-group:sp': {
    acsUrls: [
      'http://swarm.example.com/chicago/api/v10/session',
      'http://swarm.example.com/tokyo/api/v10/session',
    ]
  },
  'urn:swarm-cluster:sp': {
    acsUrlRe: 'https://swarm\\.example\\.com/[^/]+/api/v10/session'
  }
  //
  // The format for the acsUrlRe regular expression is documented here:
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
  //
}

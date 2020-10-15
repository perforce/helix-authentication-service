//
// Authentication service SAML IdP configuration file.
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
    acsUrl: 'http://swarm.example.com/api/v10/session'
  },
  'urn:swarm-2019.3:sp': {
    acsUrl: 'http://swarm.example.com/login'
  },
  'http://hth.example.com/account/saml/hth/metadata': {
    acsUrl: 'http://hth.example.com/account/saml/hth/consume'
  }
}

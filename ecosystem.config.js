//
// Example configuration file for use with pm2.
// See http://pm2.keymetrics.io for documentation on pm2.
//
// 1. Change SVC_BASE_URI to the host:port of this service.
// 2. Change the OIDC settings to suit your IdP, if using OIDC.
// 3. Change the SAML_IDP settings to suit your IdP, if using SAML.
// 4. Install SSL certificates, then update cert/key settings as necessary.
// 5. pm2 start ecosystem.config.js
//
// See the docs/Getting_Started.md file for more information.
//
module.exports = {
  apps: [{
    name: 'auth-svc',
    script: './bin/www',
    env: {
      NODE_ENV: 'production',
      OIDC_CLIENT_ID: 'client_id',
      OIDC_CLIENT_SECRET: 'client_secret',
      OIDC_ISSUER_URI: 'http://localhost:3001/',
      SVC_BASE_URI: 'https://localhost:3000',
      DEFAULT_PROTOCOL: 'oidc',
      CA_CERT_FILE: 'certs/sp.crt',
      IDP_CERT_FILE: 'certs/sp.crt',
      IDP_KEY_FILE: 'certs/sp.key',
      SAML_IDP_SSO_URL: 'http://localhost:7000/saml/sso',
      SAML_IDP_SLO_URL: 'http://localhost:7000/saml/slo',
      SAML_SP_ISSUER: 'urn:example:sp',
      SP_CERT_FILE: 'certs/sp.crt',
      SP_KEY_FILE: 'certs/sp.key'
    }
  }]
}

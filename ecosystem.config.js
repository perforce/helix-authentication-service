//
// Example configuration file for use with pm2.
// See http://pm2.keymetrics.io for documentation on pm2.
//
// 1. Change SVC_BASE_URI to the user-visible address of this service.
//    This must match the application settings in the identity provider.
// 2. Change the OIDC settings to suit your IdP, if using OIDC.
// 3. Change the SAML_IDP settings to suit your IdP, if using SAML.
// 4. Install SSL certificates, then update cert/key settings as necessary.
// 5. pm2 start ecosystem.config.js
//
// See the service documentation for details on the various settings.
//
module.exports = {
  apps: [{
    name: 'auth-svc',
    script: './bin/www',
    env: {
      CA_CERT_FILE: 'certs/ca.crt',
      NODE_ENV: 'production',
      OIDC_CLIENT_ID: 'client_id',
      OIDC_CLIENT_SECRET: 'client_secret',
      OIDC_ISSUER_URI: 'http://localhost:3001/',
      SAML_IDP_SSO_URL: 'http://localhost:7000/saml/sso',
      SAML_IDP_SLO_URL: 'http://localhost:7000/saml/slo',
      SAML_SP_ISSUER: 'urn:example:sp',
      SP_CERT_FILE: 'certs/server.crt',
      SP_KEY_FILE: 'certs/server.key',
      SVC_BASE_URI: 'https://localhost:3000'
      //
      // Below are additional optional settings and their default values.
      //
      // BIND_ADDRESS: '0.0.0.0',
      // CA_CERT_PATH: undefined,
      // DEFAULT_PROTOCOL: 'saml',
      // FORCE_AUTHN: false,
      // IDP_CERT_FILE: undefined,
      // SAML_IDP_ISSUER: undefined,
      // IDP_CONFIG_FILE: './saml_idp.conf.js',
      // LOGIN_TIMEOUT: 60,
      // SAML_AUTHN_CONTEXT: 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
      // SAML_NAMEID_FIELD: undefined,
      // SAML_NAMEID_FORMAT: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
      // SAML_SP_AUDIENCE: undefined,
      // SESSION_SECRET: 'keyboard cat',
      // SP_KEY_ALGO: 'sha256',
    }
  }]
}

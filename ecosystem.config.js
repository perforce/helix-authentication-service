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
    node_args: '-r module-alias/register',
    script: './bin/www',
    env: {
      CA_CERT_FILE: 'certs/ca.crt',
      NODE_ENV: 'production',
      OIDC_CLIENT_ID: 'client_id',
      OIDC_CLIENT_SECRET_FILE: 'secrets/oidc_client.txt',
      OIDC_ISSUER_URI: 'http://localhost:3001/',
      SAML_IDP_SSO_URL: 'http://localhost:7000/saml/sso',
      SAML_IDP_SLO_URL: 'http://localhost:7000/saml/slo',
      SAML_SP_ENTITY_ID: 'https://has.example.com',
      SP_CERT_FILE: 'certs/server.crt',
      SP_KEY_FILE: 'certs/server.key',
      SVC_BASE_URI: 'https://localhost:3000'
      //
      // Below are additional optional settings and their default values.
      //
      // BIND_ADDRESS: '0.0.0.0',
      // CA_CERT_PATH: undefined,
      // CLIENT_CERT_CN: undefined,
      // DEBUG: undefined,
      // DEFAULT_PROTOCOL: 'saml',
      // FORCE_AUTHN: false,
      // IDP_CERT_FILE: undefined,
      // LOGGING: undefined,
      // SAML_IDP_ENTITY_ID: undefined,
      // IDP_CONFIG_FILE: './saml_idp.conf.js',
      // LOGIN_TIMEOUT: 60,
      // OIDC_CLIENT_SECRET: undefined,
      // PORT: 3000,
      // PROTOCOL: 'http',
      // SAML_AUTHN_CONTEXT: 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
      // SAML_IDP_METADATA_URL: undefined,
      // SAML_NAMEID_FIELD: undefined,
      // SAML_NAMEID_FORMAT: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
      // SAML_SP_AUDIENCE: undefined,
      // SESSION_SECRET: 'keyboard cat',
      // SP_KEY_ALGO: 'sha256',
    }
  }]
}

# Identity Providers

This page describes the details for configuring the authentication service to
work with several major hosted identity providers, both with OIDC and SAML.

## Auth0

### OpenID Connect

By default the "regular web application" configured in Auth0 will have OpenID
Connect support, so all that is needed is to copy the settings to the service
configuration.

From the Auth0 management screen, select *Applications* from the left sidebar,
click on your application, and on the *Settings* tab, scroll to the bottom and
click the **Advanced Settings** link. Find the *Endpoints* tab and select it to
reveal the various endpoints. Open the **OpenID Configuration** value in a new
browser tab to get the raw configuration values. Find `issuer` and copy the
value to `OIDC_ISSUER_URI` in the service config. You can now close the
configuration tab.

On the application screen, scroll up to the top of *Settings* and copy the
**Client ID** value to the `OIDC_CLIENT_ID` setting in the service config.
Likewise for the **Client Secret** value.

The first of two additional changes to make in the Auth0 application
configuration is the addition of the **Allowed Callback URLs** under *Settings*.
As with the other providers, put the service callback URL, either
`https://svc.doc:3000/oidc/callback` or `https://svc.doc:3000/saml/sso` as
appropriate for the protocol. The second change is to the **Allowed Logout
URLs** under *Settings*; put both `https://svc.doc:3000` and
`https://svc.doc:3000/saml/slo` for OIDC and SAML, respectively.

### SAML 2.0

To enable SAML 2.0 in Auth0, you must enable the **SAML 2.0** "addon" from the
application settings. Put the `https://svc.doc:3000/saml/sso` URL for the
**Application Callback URL**, and ensure the **Settings** block looks something
like the following:

```javascript
{
  "signatureAlgorithm": "rsa-sha256",
  "digestAlgorithm": "sha256",
  "nameIdentifierProbes": [
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
  ],
  "logout": {
    "callback": "https://svc.doc:3000/saml/slo"
  }
}
```

The important part of that configuration is to set the `nameIdentifierProbes`,
otherwise the NameID returned in the SAML response is the default generated
value, which is difficult to tie back to the Perforce user account.

On the *Usage* tab of the addon screen, copy the **Identity Provider Login URL**
to the `SAML_IDP_SSO_URL` setting in the service configuration. To get the SLO
URL you will need to download the metadata and look for the
`SingleLogoutService` element, copying the `Location` attribute value to
`SAML_IDP_SLO_URL` in the config.

## Okta

Configuring the authentication service with Okta is fairly straightforward.

### OpenID Connect

1. On the Okta admin dashboard, create a new application (helps to use "classic ui").
1. Select *Web* as the **Platform** and *OpenID Connect* as the **Sign on method**.
1. Provide a meaningful name on the next screen.
1. For the **Login redirect URIs** enter the auth service URL; for Docker this
   would be `https://svc.doc:3000/oidc/callback`
1. For the **Logout redirect URIs** enter the base auth service URL; for Docker this
   would be `https://svc.doc:3000`
1. On the next screen, copy the **Client ID** and **Client secret** values to
   the `docker-compose.yml` for the `svc.doc` settings under `environment`
   (namely the `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET` keys).
1. From the *Sign On* tab, copy the **Issuer** value to `OIDC_ISSUER_URI` in the
   docker environment for `svc.doc`.
1. Use `docker-compose` to rebuild and start the `svc.doc` container with the
   new settings (the `build` and `up -d` subcommands are sufficient to rebuild
   and restart the container).

If you have already logged into Okta, be sure to either a) assign that user to
the application you just created, or b) log out so you can log in again using
the credentials for a user that is assigned to the application. Otherwise you
will immediately go to the "login failed" page, and the only indication of the
cause is in the Okta system logs.

Visit the auth service OIDC [login page](https://svc.doc:3000/oidc/login) to
test. Note that this URL will be configured into the auth extension, the user
will never have to enter the value directly.

### SAML 2.0

1. On the Okta admin dashboard, create a new application (helps to use "classic ui").
1. Select *Web* as the **Platform** and *SAML 2.0* as the **Sign on method**.
1. For the **Single sign on URL** enter the auth service URL; for Docker this
   would be `https://svc.doc:3000/saml/sso`
1. For the **Audience URI** enter `urn:example:sp`, assuming you are using Docker.
1. For the **Name ID format** the auth extensions expect *EmailAddress*,
   otherwise it cannot verify the expected user has authenticated.
1. Click the **Show Advanced Settings** link and check the **Enable Single Logout** checkbox.
1. For the **Single Logout URL** enter the auth service logout URL; for Docker
   this would be `https://svc.doc:3000/saml/slo`
1. Enter `urn:example:sp` for the **SP Issuer** value.
1. For **Signature Certificate**, select and upload the `certs/sp.crt` file,
   assuming the Docker auth service is being used here.
1. From the *Sign On* tab, click the **View Setup Instructions** button and copy
   the values for IdP SSO and SLO URLs to the `SAML_IDP_*` settings in the
   docker environment for `svc.doc`.
1. Use `docker-compose` to rebuild and start the `svc.doc` container with the
   new settings (the `build` and `up -d` subcommands are sufficient to rebuild
   and restart the container).
1. Configure the extension to use `nameID` as the `name-identifier` value since
   the SAML response from Okta generally does not have the email field.

If you have already logged into Okta, be sure to either a) assign that user to
the application you just created, or b) log out so you can log in again using
the credentials for a user that is assigned to the application. Otherwise you
will immediately go to the "login failed" page, and the only indication of the
cause is in the Okta system logs.

Visit the auth service SAML [login page](https://svc.doc:3000/saml/login) to
test. Note that this URL will be configured into the auth extension, the user
will never have to enter the value directly.

## OneLogin

### OpenID Connect

1. From the admin dashboard, create a new app: search for `OIDC` and select
   **OpenId Connect (OIDC)** from the list.
1. On the *Configuration* screen, enter `https://svc.doc:3000/oidc/login` for **Login Url**
1. On the same screen, enter `https://svc.doc:3000/oidc/callback` for **Redirect URI's**
1. Find the **Save** button and click it.
1. From the *SSO* tab, copy the **Client ID** value to the `OIDC_CLIENT_ID`
   setting in the docker environment for `svc.doc`.
1. From the *SSO* tab, copy the **Client Secret** value to the
   `OIDC_CLIENT_SECRET` setting in the docker environment for `svc.doc` (n.b.
   you may need to "show" the secret first before the copy button will work).
1. Ensure the **Application Type** is set to _Web_
1. Ensure the **Token Endpoint** is set to _Basic_
1. Use `docker-compose` to rebuild and start the `svc.doc` container with the
   new settings (the `build` and `up -d` subcommands are sufficient to rebuild
   and restart the container).

Visit the auth service OIDC [login page](https://svc.doc:3000/oidc/login) to
test. Note that this URL will be configured into the auth extension, the user
will never have to enter the value directly.

### SAML 2.0

1. From the admin dashboard, create a new app: search for `SAML` and select
   **SAML Test Connector (IdP w/ NameID Persistent)** from the list.
1. On the *Configuration* screen, enter `urn:example:sp` for **Audience**
1. On the same screen, enter `https://svc.doc:3000/saml/sso` for **Recipient**
1. And for *ACS (Consumer) URL Validator*, enter `.*` to match any value
1. For *ACS (Consumer) URL*, enter `https://svc.doc:3000/saml/sso`
1. For *Single Logout URL*, enter `https://svc.doc:3000/saml/slo`
1. Find the **Save** button and click it.
1. From the *SSO* tab, copy the **SAML 2.0 Endpoint** value to the
   `SAML_IDP_SSO_URL` setting in the docker environment for `svc.doc`.
1. From the *SSO* tab, copy the **SLO Endpoint** value to the `SAML_IDP_SLO_URL`
   setting in the docker environment for `svc.doc`.
1. Use `docker-compose` to rebuild and start the `svc.doc` container with the
   new settings (the `build` and `up -d` subcommands are sufficient to rebuild
   and restart the container).

Visit the auth service SAML [login page](https://svc.doc:3000/saml/login) to
test. Note that this URL will be configured into the auth extension, the user
will never have to enter the value directly.
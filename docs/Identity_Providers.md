# Identity Providers

This page describes the details for configuring the authentication service to
work with several major hosted identity providers, both with OIDC and SAML.

For every occurrence of `SVC_BASE_URI` in the instructions below, be sure to
substitute the actual protocol, host, and port for the authentication service
(e.g. `https://localhost:3000` for development environments). This address must
match the URL that the identity provider is configured to recognize as the "SSO"
or "callback" URL for the application.

## Configuration

### Environment Variables

In the instructions below, when referring to setting environment variables for
the auth service, there are several choices.

1. Set them in the environment, such as in the command shell.
1. Define them in a file called `.env` in the auth service source tree (in the same directory as the `package.json` file).
1. If you are using `pm2`, then edit the `ecosystem.config.js` file.

### SAML entity identifiers

When configuring the service as a "service provider" within a SAML identity
provider, you must provide an _entityID_ that is unique within your set of
registered applications. By default the service uses the value `urn:example:sp`,
which can be changed by setting the `SAML_SP_ISSUER` environment variable.
Anywhere that `urn:example:sp` appears in the following instructions, you should
replace it with the value you defined in the identity provider.

## Restarting the Service

Changing the environment settings requires restarting the service for the changes
to take effect. How the service is deployed determines how to restart it.

1. If using `npm start`, then Ctrl-c to stop the running process, and run `npm start` again.
1. If using `pm2`, then `pm2 startOrReload ecosystem.config.js`

## Auth0

### OpenID Connect

1. From the admin dashboard, click the *CREATE APPLICATION* button.
1. Enter a meaningful name for the application.
1. Select the *Regular Web Application* button, then click *Create*.
1. Open the *Settings* tab, copy the **Client ID** and **Client Secret** values to
   `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET` settings in the service configuration.
1. For **Allowed Callback URLs** add `{SVC_BASE_URI}/oidc/callback`
1. For **Allowed Logout URLs** add `{SVC_BASE_URI}`
1. Scroll to the bottom of the *Settings* screen and click the **Advanced Settings** link.
1. Find the *Endpoints* tab and select it.
1. Open the **OpenID Configuration** value in a new browser tab to get the raw
   configuration values. Find `issuer` and copy the value to `OIDC_ISSUER_URI` in
   the service config. You can now close the configuration tab.
1. At the bottom of the page, click the *SAVE CHANGES* button.

### SAML 2.0

1. From the admin dashboard, click the *CREATE APPLICATION* button.
1. Enter a meaningful name for the application.
1. Select the *Regular Web Application* button, then click *Create*.
1. On the application *Settings* screen, add `{SVC_BASE_URI}/saml/sso` to the
   **Allowed Callback URLs** field.
1. For **Allowed Logout URLs** add `{SVC_BASE_URI}/saml/slo`
1. At the bottom of the page, click the *SAVE CHANGES* button.
1. Click the *Addons* tab near the top of the application page.
1. Click the *SAML2 WEB APP* button to enable SAML 2.0.
1. Enter `{SVC_BASE_URI}/saml/sso` for the **Application Callback URL**
1. Ensure the **Settings** block looks something like the following:

```javascript
{
  "signatureAlgorithm": "rsa-sha256",
  "digestAlgorithm": "sha256",
  "nameIdentifierProbes": [
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
  ],
  "logout": {
    "callback": "{SVC_BASE_URI}/saml/slo"
  }
}
```

1. Click the *ENABLE* button at the bottom of the page.
1. On the *Usage* tab of the addon screen, copy the **Identity Provider Login URL**
   to the `SAML_IDP_SSO_URL` setting in the service configuration.
1. To get the SLO URL you will need to download the metadata and look for the
   `SingleLogoutService` element, copying the `Location` attribute value to
   `SAML_IDP_SLO_URL` in the config.

## Azure Active Directory

### OpenID Connect

1. Visit the Azure [portal](https://portal.azure.com/)
1. Register a new application under Azure Active Directory
    * You can use a single app registration for both OIDC and SAML.
1. Enter the auth service URL as the **redirect URL**
1. Copy the *Application (client) ID* to the `OIDC_CLIENT_ID` environment variable
1. Open the OIDC metadata URL in the browser (click _Endpoints_ button from app overview page)
1. Copy the `issuer` URL and enter as the `OIDC_ISSUER_URI` environment variable;
   if the issuer URI contains `{tenantid}` then replace it with the _Directory (tenant) ID_
   from the application overview page.
1. Under _Certificates & secrets_, click **New client secret**, copy the secret value
   to the `OIDC_CLIENT_SECRET` environment variable
1. Add a user account (*guest* works well) such that it has a defined **email** field;
   for whatever reason, "personal" accounts do not have the "email" field defined.
1. Make sure the Perforce user email address matches the user in Active Directory

### SAML 2.0

1. Visit the Azure [portal](https://portal.azure.com/)
1. Register a new application under Azure Active Directory
    * You can use a single app registration for both OIDC and SAML.
1. Enter the auth service URL as the **redirect URL**
1. Copy the *Application (client) ID* to the `SAML_SP_ISSUER` environment variable
1. Open the API endpoints page: click the _Endpoints_ button from app overview page
1. Copy the *SAML-P sign-on endpoint* value to the `SAML_IDP_SSO_URL` environment variable
1. Copy the *SAML-P sign-out endpoint* value to the `SAML_IDP_SLO_URL` environment variable
1. Set the `SAML_NAMEID_FORMAT` environment variable to the value
   `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress`
1. Make sure the Perforce user email address matches the user in Active Directory
1. Configure the extension to use `nameID` as the `name-identifier` value.

## Okta

### OpenID Connect

1. On the Okta admin dashboard, click the **Create a New** application button
   (helps to use "classic ui").
1. Select *Web* as the **Platform** and *OpenID Connect* as the **Sign on method**.
1. Provide a meaningful name on the next screen.
1. For the **Login redirect URIs** enter `{SVC_BASE_URI}/oidc/callback`
1. For the **Logout redirect URIs** enter `{SVC_BASE_URI}`
1. On the next screen, find the **Client ID** and **Client secret** values and
   copy to the `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET` service settings.
1. From the *Sign On* tab, copy the **Issuer** value to `OIDC_ISSUER_URI`.

If you are already logged into Okta, be sure to either a) assign that user to
the application you just created, or b) log out so you can log in again using
the credentials for a user that is assigned to the application. Otherwise you
will immediately go to the "login failed" page, and the only indication of the
cause is in the Okta system logs.

### SAML 2.0

1. On the Okta admin dashboard, click the **Create a New** application button
   (helps to use "classic ui").
1. Select *Web* as the **Platform** and *SAML 2.0* as the **Sign on method**.
1. Provide a meaningful name on the next screen.
1. Click *Save* to go to the next screen.
1. For the **Single sign on URL** enter `{SVC_BASE_URI}/saml/sso`
1. For the **Audience URI** enter `urn:example:sp`
1. Click the **Show Advanced Settings** link and check the **Enable Single Logout** checkbox.
1. For the **Single Logout URL** enter `{SVC_BASE_URI}/saml/slo`
1. For the **SP Issuer** enter `urn:example:sp`
1. For **Signature Certificate**, select and upload the `certs/server.crt` file.
1. Click the *Next* button to save the changes.
1. There may be an additional screen to click through.
1. From the *Sign On* tab, click the **View Setup Instructions** button and copy the
   values for IdP SSO and SLO URLs to the `SAML_IDP_SSO_URL` and `SAML_IDP_SLO_URL`
   settings in the environment.
1. Configure the extension to use `nameID` as the `name-identifier` value.
1. Configure the extension to use `user` as the `user-identifier` value.

If you are already logged into Okta, be sure to either a) assign that user to
the application you just created, or b) log out so you can log in again using
the credentials for a user that is assigned to the application. Otherwise you
will immediately go to the "login failed" page, and the only indication of the
cause is in the Okta system logs.

## OneLogin

### OpenID Connect

1. From the admin dashboard, create a new app: search for `OIDC` and select
   **OpenId Connect (OIDC)** from the list.
1. On the *Configuration* screen, enter `{SVC_BASE_URI}/oidc/login` for **Login Url**
1. On the same screen, enter `{SVC_BASE_URI}/oidc/callback` for **Redirect URI's**
1. Find the **Save** button and click it.
1. From the *SSO* tab, copy the **Client ID** value to the `OIDC_CLIENT_ID`
   environment variable.
1. From the *SSO* tab, copy the **Client Secret** value to `OIDC_CLIENT_SECRET`
   (you may need to "show" the secret first before the copy button will work).
1. From the *SSO* tab, find the **OpenID Provider Configuration Information** link
   and open in a new tab. Find the `issuer` and copy the URL value to the
   `OIDC_ISSUER_URI` environment variable.
1. Ensure the **Application Type** is set to _Web_
1. Ensure the **Token Endpoint** is set to _Basic_

### SAML 2.0

1. From the admin dashboard, create a new app: search for `SAML` and select
   **SAML Test Connector (Advanced)** from the list.
1. On the *Configuration* screen, enter `urn:example:sp` for **Audience**
1. On the same screen, enter `{SVC_BASE_URI}/saml/sso` for **Recipient**
1. And for *ACS (Consumer) URL Validator*, enter `.*` to match any value
1. For *ACS (Consumer) URL*, enter `{SVC_BASE_URI}/saml/sso`
1. For *Single Logout URL*, enter `{SVC_BASE_URI}/saml/slo`
1. For *Login URL*, enter `{SVC_BASE_URI}/saml/sso`
1. For *SAML initiator* select **Service Provider**
1. Find the **Save** button and click it.
1. From the *SSO* tab, copy the **SAML 2.0 Endpoint** value to the
   `SAML_IDP_SSO_URL` environment variable.
1. From the *SSO* tab, copy the **SLO Endpoint** value to `SAML_IDP_SLO_URL`.
1. Configure the extension to use `nameID` as the `name-identifier` value.

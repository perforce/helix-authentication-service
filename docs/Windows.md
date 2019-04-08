# Windows

## Installation

### Initial Setup

1. Install [Node LTS](https://nodejs.org/)
1. Install [Visual Studio Code](https://code.visualstudio.com) (git wants an editor)
1. Install [Git](https://git-scm.com) (npm wants git to fetch dependencies)
1. Install the Perforce client (`p4.exe` is sufficient)
1. Get the auth service code (`//depot/main/p4-auth-integ-svc/...`)
1. Build the service code (`npm i`)

### OIDC test provider

1. Open a new PowerShell window
1. Switch to `containers/oidc` directory
1. Create a `.env` file as described in the `README.md`
1. Add the `PORT=3001` to the `.env` file for convenience
1. Start the OIDC provider: `npm start`

### Auth service

1. Open a new PowerShell window
1. Switch to the auth service directory
1. Create a `.env` file as described in the `README.md`
1. Start the auth service: `npm start`

### Helix Server

1. Open a new PowerShell window
1. Switch to another directory in which to start p4d
1. Start the server: `p4d -d -r p4root`
1. Create a `super` user and bestow super privileges.
1. Add `super` user to group with unlimited password timeout.
1. Allow non-SSO access: `p4 configure set auth.sso.allow.passwd=1`
1. Create a `johndoe` user whose email is `johndoe@example.com`

### Login extensions

1. It is easiest to use VS Code to edit `hook.js` to change these settings:
    * `P4PORT` to `localhost:1666`
    * `AUTH_URL` to `https://localhost:3000`
1. Install the extensions in the server: `node hook.js`

## Testing

In yet another PowerShell window, run `p4 -u johndoe -p localhost:1666 login`,
and you should see the default browser appear and ask you to authenticate with
the test OIDC provider. If successful, the p4 user should be validated and a
ticket issued.

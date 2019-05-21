# Testing Setup

## Create VM

1. Select Ubuntu 18.04 LTS server template and create a new VM.
1. Make sure it has a connected network adapter.
1. Start the VM and ensure connectivity.

## Machine Setup

### Host Name

Set the hostname to something other than the _template_ default by editing `/etc/hostname`, and then rebooting the system.

### Disk Space

The default VM will likely have very limited disk space, so increase its size:

```shell
$ lvm lvextend -L +8G /dev/vg0/root
$ resize2fs /dev/vg0/root
```

### Create Sudo User

Create a system user for provisioning and testing.

```shell
$ useradd -G users -m -s /bin/bash charlie
$ yes 'p8ssword' | passwd charlie
$ echo 'charlie ALL=(ALL:ALL) NOPASSWD:ALL' >> /etc/sudoers.d/local
```

The last command enables password-less sudo for the new user, otherwise provisioning with Fabric will prompt for passwords.

## Provisioning

For convenience, create an `ssh_config` file with an entry for connecting to the VM using the account created above (the example below assumes the entry `Host` is set to `myhost`, but you can use any name you like). To use key-based authentication, use the `ssh-copy-id` command to copy a public key to the remote system, thus avoiding entering a password during provisioning; if you do, add an `IdentityFile` entry to the `ssh_config` file

Use the `fabfile.py` script to provision the VM for running the Helix Server and authentication service.

```shell
$ fab -H myhost prepare
$ fab -H myhost provision_service
$ fab -H myhost provision_p4d
```

The `fab` command comes from [Fabric](https://www.fabfile.org), in particular the 1.14 version. Fabric requires either [Python](https://www.python.org) 2.x or 3 and can be installed using [pip](https://pypi.org/project/pip/), like so:

```shell
$ pip install Fabric==1.14
```

## Configuration

### Identity Provider

Use the `Identity_Providers.md` document in this directory to configure an application with the desired identity provider (e.g. OIDC with Okta). Make sure to assign a user to the application, otherwise you cannot log in at all.

### Helix Server

Create a Perforce user for testing, whose email and/or username will match what comes back from the IdP. For instance, if you have a user account on the IdP with the email address `johndoe@example.com` then create a Perforce user whose `Email` matches that.

### Service

Once the IdP has been configured for your application, collect the relevant protocol details and copy them to the `p4-auth-integ-svc/ecosystem.config.js` in the host machine. For instance, with OIDC you will need to set the `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, and `OIDC_ISSUER_URI` variables, while for SAML the `SAML_IDP_SSO_URL` and `SAML_IDP_SLO_URL` values must be set appropriately.

Once the settings have been saved, use the `pm2` command to restart the service.

```shell
$ pm2 startOrReload p4-auth-integ-svc/ecosystem.config.js
```

### Extension

Ensure the `Auth::loginhook` extension is configured to use the desired authentication protocol (either `oidc` or `saml`). See the `Getting_Started.md` document in this directory for details.

## Creating Test Users

To authenticate using a system such as Okta, you will need to have a Perforce user account whose `Email` matches the user record in the identity provider. At security level 3, all Perforce user's **must** have a password in the database. So after creating the user in Perforce, make sure to set the password using the `super` account:

```shell
$ yes Sup0rSecr0tPassw0rd | p4 -u super passwd myuser
```

For added security, try `yes $(uuidgen)` to generate a random password. No one will ever see it, including you.

On Windows systems, there is no `yes` command, so instead use `p4 -u super passwd myuser` and enter the password twice.

## Troubleshooting

### Authentication fails

If you attempt to log in and the service page says that authentication failed, chances are either the user does not exist, you typed the wrong password, or the user is not assigned to the application. This is especially true with Okta, which does not assign any users to the application that you created.

### Cannot Set User Password

Because the extension is hooked into the login mechanism, it will be invoked by the server when a user attempts to change their password (as with the `auth-set` trigger). However, we have no means for supporting this feature with OIDC and SAML, so it is not implemented in the extension. When a user attempts to change their password, they may see this message:

```shell
$ p4 -p1666 -u super passwd
Command unavailable: external authentication 'auth-set' trigger not found.
```

That is to be expected for SSO users, but should not be the case for non-SSO users. If you see this message for a non-SSO user, then be sure to add them to the non-sso-users or non-sso-groups extension configuration, and then ensure the `auth.sso.allow.passwd` configurable is set to `1`; without this, you cannot set passwords in the Perforce database:

```shell
$ p4 configure set auth.sso.allow.passwd=1
```

Once the user is properly excluded, they will be able to change their password.

## Installation Script

In the auth service root directory is a bash script called `install.sh` that will install the authentication service and its dependencies on a Linux-based system. The script should work for CentOS 6/7 and Ubuntu 14, 16, and 18. Running it on any other system should report *not supported* or similar.

Running the script twice should have no adverse effect. It may restart the service in the process, but it will not cause the service to stop working, nor install the same software twice.

The results of the installation should be a running Node process, which can be seen with the `pm2 list` command. Likewise, fetching the service home page should display its "welcome" message (e.g. `curl -k https://127.0.0.1:3000`).

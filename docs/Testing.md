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

## Troubleshooting

### Authentication fails

If you attempt to log in and the service page says that authentication failed, chances are either the user does not exist, you typed the wrong password, or the user is not assigned to the application. This is especially true with Okta, which does not assign any users to the application that you created.

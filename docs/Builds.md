# Automated Builds

## Initial Setup

### Ubuntu 18

Create an Ubuntu VM from a template.

Increase the size of the main file system (2GB is not nearly enough).

Set hostname in `/etc/hostname` and then reboot.

Update the system packages: `apt-get update`, `apt-get upgrade`

Install the latest Helix server and client packages:

```shell
$ wget -q http://pkg-ondemand.bnr.perforce.com/perforce/main/perforce.pubkey
$ apt-get install gnupg
$ apt-key add perforce.pubkey
$ rm -f perforce.pubkey
$ echo "deb http://pkg-ondemand.bnr.perforce.com/perforce/main/apt/ubuntu $(lsb_release -sc) release" > /etc/apt/sources.list.d/perforce.sources.list
$ apt-get update
$ apt-get install helix-cli helix-p4d
$ /opt/perforce/sbin/configure-helix-p4d.sh -n -p $(hostname -I | cut -d ' ' -f 1):1666 -u super -P Rebar123 despot
```

Install NFS package: `apt-get install nfs-common`

Add the NFS mount point:

```shell
$ echo 'engtools-fs.perforce.com:/ecloud  /ecloud  nfs  defaults  0  0' >> /etc/fstab
```

As root, `mkdir /ecloud` and `mount /ecloud` to mount the EC shared disk.

Create a `commander` group and `ecagent` user (uid/gid 20666):

```shell
$ groupadd -g 20666 commander
$ useradd -g commander -G sudo -u 20666 -d /ecloud/ecagent -m -N -s /bin/bash ecagent
$ passwd ecagent
```

Install 32-bit compatibility libs: `apt-get install libc6-i386`

Run EC installer from `/ecloud/ElectricCommander/production`

Register resource in EC (pool name must be different than resource name)

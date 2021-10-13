#!/usr/bin/env bash
#
# Install and configure a p4d instance for testing SCIM.
#
set -e

# move to the directory containing this script
cd "$( cd "$(dirname "$0")" ; pwd -P )"

export DEBIAN_FRONTEND='noninteractive'
export APT_URL='http://package.perforce.com/apt/ubuntu'
export PUB_KEY='http://package.perforce.com/perforce.pubkey'
export P4PORT='0.0.0.0:1666'

sudo apt-get update
sudo apt-get -q -y install apt-utils lsb-release gnupg patch wget
wget -O perforce.pubkey "${PUB_KEY}"
sudo apt-key add perforce.pubkey
rm -f perforce.pubkey
echo "deb ${APT_URL} $(lsb_release -sc) release" | sudo tee /etc/apt/sources.list.d/perforce.sources.list
sudo apt-get update
sudo apt-get -q -y install helix-cli helix-p4d

# patch configure script to wait for p4d to start fully (P4-20611)
cp configure.diff /tmp
cd /opt/perforce/sbin && sudo patch -p0 </tmp/configure.diff
sudo /opt/perforce/sbin/configure-helix-p4d.sh -n -p "${P4PORT}" -u super -P Rebar123 main

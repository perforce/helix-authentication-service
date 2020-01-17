#!/usr/bin/env bash
#
# Authentication service installation script for Linux systems.
#
# Copyright 2019, Perforce Software Inc. All rights reserved.
#
INTERACTIVE=true
MONOCHROME=false

function die() {
    error "ERROR: $*" >&2
    exit 1
}

function error() {
    if ! $MONOCHROME; then
        # ANSI red
        echo -e "\033[31m$1\033[0m" >&2
    else
        echo "$1" >&2
    fi
}

function usage() {
    cat <<EOS
Installation script for authentication service.

Usage:

    install.sh [-m] [-n]

Description:

    Install the authentication service and its dependencies.

    -m
            Monochrome; no colored text.

    -n
            Non-interactive; does not prompt for confirmation.

    -h | --help
            Display this help message.
EOS
}

while [[ -n "$1" ]]; do
    case "$1" in
    -m) MONOCHROME=true; shift;;
    -n) INTERACTIVE=false; shift;;
    -h) usage ; exit 0;;
    --help) usage ; exit 0;;
    --) shift ; break ;;
    *) die "Command-line syntax error! Unknown option: $1" ; exit 1 ;;
    esac
done

#
# This prevents a particular kind of error caused by npm trying to reduce its
# privileges when running the pre/post install scripts of certain Node modules,
# and subsequently running into a file permissions error. Technically if the
# files are owned by root and root runs this script, it _should_ work.
#
if [[ $EUID -eq 0 ]]; then
    die 'This script must be run as a non-root user.'
fi

# Test file permissions to ensure a successful install.
mkdir -p node_modules > /dev/null 2>&1
if [ $? != 0 ]; then
    die 'You do not have permission to write to this directory.'
fi

if [ -e "/etc/redhat-release" ]; then
    PLATFORM=redhat
elif [ -e "/etc/debian_version" ]; then
    PLATFORM=debian
else
    # Exit now if this is not a supported Linux distribution
    die "Could not determine OS distribution"
fi
set -e

echo ''
echo 'This script will install the requirements for the Authentication Service.'
echo ''
echo 'The operations involved are as follows:'
echo '  * Install OS packages for build dependencies'
echo '  * Download and install Node.js 12'
echo '  * Download and install the pm2 process manager (http://pm2.keymetrics.io)'
echo '  * Download and build the service dependencies'
echo ''
echo 'This script will only install software on this machine. After this script is'
echo 'finished, you will need to:'
echo ''
echo '  1) Configure the service by editing the ecosystem.config.js file.'
echo '  2) Restart the service by invoking `pm2 startOrReload ecosystem.config.js`'
echo ''
if $INTERACTIVE; then
    echo ''
    echo "Do you wish to continue?"
    select yn in "Yes" "No"; do
        case $yn in
            Yes ) break;;
            No ) exit;;
        esac
    done
fi

# Move to source directory
cd "$( cd "$(dirname "$0")" ; pwd -P )"

#
# Install Node 12 using a script from nodesource.com
#
if ! which node >/dev/null 2>&1; then
    echo "Preparing to install OS packages and Node.js..."
    if [ $PLATFORM == "debian" ]; then
        # Because apt-get will happily fail miserably _and_ return an exit code of
        # 0, we are forced to check for a functional network connection rather than
        # relying on set -e to work effectively with the apt-get command.
        echo 'Checking network connection...'
        set +e  # don't exit due to ping returning non-zero, we want that code
        ping -c 3 ubuntu.com > /dev/null 2>&1
        if [ $? != 0 ]; then
            die 'Unable to reach ubuntu.com, please check your connection'
        fi
        set -e  # now go back to exiting if a command returns non-zero
        sudo apt-get -q update
        sudo apt-get -q -y install build-essential curl git
        # Run a shell script from the internet as root to get version 12
        # directly from the vendor. This includes npm as well.
        #
        # c.f. https://nodejs.org/en/download/package-manager/
        curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
        sudo apt-get -q -y install nodejs
    elif [ $PLATFORM == "redhat" ]; then
        # Add --skip-broken for Oracle Linux and its redundant packages
        sudo yum -q -y install --skip-broken gcc-c++ git make
        # Run a shell script from the internet as root to get version 12
        # directly from the vendor. This includes npm as well.
        #
        # c.f. https://nodejs.org/en/download/package-manager/
        curl -sL https://rpm.nodesource.com/setup_12.x | sudo -E bash -
        if [ $(rpm --eval %{rhel}) == '8' ]; then
            # NodeSource dependencies are broken for the time being on the
            # latest CentOS/RHEL release. It expects a 'python' package but it
            # has been renamed to 'python2' (and additionally 'python3') now.
            dnf --repo=nodesource download nodejs
            sudo rpm -i --nodeps nodejs-12.*.rpm
            rm -f nodejs-12.*.rpm
        else
            sudo yum -q -y install nodejs
        fi
    fi
fi

# run npm once as the unprivileged user so it creates the ~/.config directory
# with the unprivileged user as the owner, rather than as root when we run the
# very first 'npm install' command later
npm version >/dev/null 2>&1

# install pm2 globally
if ! which pm2 >/dev/null 2>&1; then
    echo "Installing pm2 globally..."
    sudo npm install -q -g pm2
fi

# fetch and build the service dependencies
if ! test -f package.json; then
    die 'Missing package.json file for authentication service'
fi
echo "Building dependencies for auth service..."
npm ci -q

# start the service using pm2
echo "Starting the auth service with default configuration..."
pm2 start ecosystem.config.js

# install pm2 startup script
echo "Installing pm2 startup script..."
sudo pm2 startup -u ${USER} --hp ${HOME}
pm2 save

echo ""
echo "==============================================================================="
echo 'Automated install complete! Now a few final bits to do manually.'
echo "==============================================================================="
echo ''
echo 'To configure the service on this machine, edit the ecosystem.config.js'
echo 'file. In particular, set the OIDC or SAML settings according to your'
echo 'identity provider.'
echo ''
echo 'For assistance, please contact support@perforce.com'
echo ''

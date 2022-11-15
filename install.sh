#!/usr/bin/env bash
#
# Authentication service installation script for Linux systems.
#
# Copyright 2022, Perforce Software Inc. All rights reserved.
#
INTERACTIVE=true
MONOCHROME=false
CREATE_USER=true
ALLOW_ROOT=false
HOMEDIR=/opt/perforce
UPGRADE_NODE=false
INSTALL_PM2=false

# Print arguments to STDERR and exit.
function die() {
    error "FATAL: $*" >&2
    exit 1
}

# Begin printing text in green.
function highlight_on() {
    $MONOCHROME || echo -n -e "\033[32m"
    $MONOCHROME && echo -n '' || true
}

# Reset text color to default.
function highlight_off() {
    $MONOCHROME || echo -n -e "\033[0m"
    $MONOCHROME && echo -n '' || true
}

# Print the first argument in red text on STDERR.
function error() {
    $MONOCHROME || echo -e "\033[31m$1\033[0m" >&2
    $MONOCHROME && echo -e "$1" >&2 || true
}

function usage() {
    cat <<EOS

Usage:

    install.sh [OPTIONS]

Description:

    Install the authentication service and its dependencies, as well as
    create and start a systemd service unit to manage the service.

    --no-create-user
        Do _not_ create the perforce user and group that will own the
        systemd service.

    --pm2
        Install and use the pm2 process manager instead of systemd.

    --upgrade
        Upgrade an existing package-based installation of Node.js with
        the latest supported version.

    --allow-root
        Allow the root user to run the install script. This may leave
        some files owned and writable only by the root user, which can
        cause other problems.

    -m
        Monochrome; no colored text.

    -n
        Non-interactive mode; exits immediately if prompting is required.

    -h / --help
        Display this help message.

See the Helix Authentication Service Administrator Guide for additional
information pertaining to configuring and running the service.

EOS
}

function read_arguments() {
    while [[ -n "$1" ]]; do
        case "$1" in
        -m)
            MONOCHROME=true
            shift
            ;;
        --no-create-user)
            CREATE_USER=false
            shift
            ;;
        --pm2)
            INSTALL_PM2=true
            shift
            ;;
        --upgrade)
            UPGRADE_NODE=true
            shift
            ;;
        --allow-root)
            ALLOW_ROOT=true
            shift
            ;;
        -n)
            INTERACTIVE=false
            shift
            ;;
        -h)
            usage
            exit 0
            ;;
        --help)
            usage
            exit 0
            ;;
        --)
            shift
            break
            ;;
        *)
            die "Unknown option: $1"
            exit 1
            ;;
        esac
    done
}

# Check that prerequisites are met before starting installation.
function ensure_readiness() {
    # This prevents a particular kind of error caused by npm trying to reduce
    # its privileges when running the pre/post install scripts of certain Node
    # modules, and subsequently running into a file permissions error. If the
    # files are owned by root and root runs this script, it _should_ work.
    if [[ $EUID -eq 0 ]] && ! $ALLOW_ROOT; then
        die 'This script must be run as a non-root user.'
    fi

    # Test file permissions to ensure dependencies can be installed.
    mkdir -p node_modules > /dev/null 2>&1
    if [ $? != 0 ]; then
        die 'You do not have permission to write to this directory.'
    fi

    # Ensure this system is supported by the installation script.
    if [ -e "/etc/redhat-release" ]; then
        PLATFORM=redhat
    elif [ -e "/etc/debian_version" ]; then
        PLATFORM=debian
    elif [ -e "/etc/os-release" ]; then
        # read os-release to find out what this system is like
        ID_LIKE=$(awk -F= '/ID_LIKE/ {print $2}' /etc/os-release | tr -d '"')
        read -r -a LIKES <<< "$ID_LIKE"
        for like in "${LIKES[@]}"; do
            if [[ "$like" == 'centos' || "$like" == 'rhel' || "$like" == 'fedora' ]]; then
                PLATFORM=redhat
                break
            fi
            if [[ "$like" == 'debian' ]]; then
                PLATFORM=debian
                break
            fi
        done
    fi
    if [ -z "$PLATFORM" ]; then
        die "Could not determine OS distribution"
    fi
}

# Show a message about the interactive configuration procedure.
function display_interactive() {
    highlight_on
    cat <<EOT

This script will install the requirements for the Authentication Service.

The operations involved are as follows:

  * Install OS packages for build dependencies
  * Download and install Node.js v18 (https://nodejs.org)
  * Download and build the service dependencies
EOT

    if $INSTALL_PM2; then
        cat <<EOT
  * Download and install the pm2 process manager (http://pm2.keymetrics.io)

This script will only install software on this machine. After this script is
finished, you will need to:

  1) Configure the service by editing the ecosystem.config.cjs file.
  2) Restart the service by invoking the following commands:
     $ pm2 kill
     $ pm2 start ecosystem.config.cjs

EOT
    else
        cat <<EOT
  * Create and start the systemd service unit to manage the service

This script will only install software on this machine. After this script is
finished, you will need to:

  1) Configure the service by editing the .env file in the base directory.
  2) Restart the service by invoking the following command:
     $ systemctl restart helix-auth

EOT
    fi
    highlight_off
}

# Prompt user to proceed with or cancel the configuration.
function prompt_to_proceed() {
    echo 'Do you wish to continue?'
    select yn in 'Yes' 'No'; do
        case $yn in
            Yes) break;;
            No) exit;;
        esac
    done
}

# If Node.js is installed, ensure that the version is supported.
function check_nodejs() {
    if which node >/dev/null 2>&1 && ! node --version | grep -Eq '^v1(4|6)\.'; then
        # check if Node.js came from the package 'nodejs' package or not
        UPGRADABLE=true
        if [ $PLATFORM == "debian" ]; then
            if ! apt-cache policy nodejs | grep -Eq 'Installed:.+nodesource*'; then
                UPGRADABLE=false
            fi
        elif [ $PLATFORM == "redhat" ]; then
            if ! rpm -q nodejs >/dev/null 2>&1; then
                UPGRADABLE=false
            fi
        fi
        if ! $UPGRADABLE; then
            error 'Found a version of Node.js that cannot be upgraded automatically.'
            error 'Please upgrade Node.js to v14, v16, or v18 before proceeding.'
            exit 1
        fi
        if $INTERACTIVE; then
            echo ''
            echo 'Found a version of Node.js that is not the required v14/v16/v18.'
            echo 'Do you wish to upgrade the Node.js installation?'
            select yn in 'Yes' 'No'; do
                case $yn in
                    Yes) break;;
                    No) exit;;
                esac
            done
        elif ! $UPGRADE_NODE; then
            die 'Node.js v14, v16, or v18 is required, please upgrade.'
        fi
        # else the script will automatically install the required version
    fi
}

# Install or upgrade Node.js using a script from nodesource.com
function install_nodejs() {
    # Both an upgrade and a new installation work in the same manner.
    if $UPGRADE_NODE || ! which node >/dev/null 2>&1; then
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
            # Run a shell script from the internet as root to get Node.js
            # directly from the vendor. This includes npm as well.
            #
            # c.f. https://nodejs.org/en/download/package-manager/
            curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get -q -y install nodejs
        elif [ $PLATFORM == "redhat" ]; then
            # In the upgrade scenario, need to remove the repository package first.
            if [ -f /etc/yum.repos.d/nodesource-el7.repo ]; then
                sudo rpm -e nodesource-release-el7
            elif [ -f /etc/yum.repos.d/nodesource-el8.repo ]; then
                sudo rpm -e nodesource-release-el8
            fi
            # Add --skip-broken for Oracle Linux and its redundant packages
            sudo yum -q -y install --skip-broken curl gcc-c++ git make
            # Run a shell script from the internet as root to get Node.js
            # directly from the vendor. This includes npm as well.
            #
            # c.f. https://nodejs.org/en/download/package-manager/
            curl -sL https://rpm.nodesource.com/setup_18.x | sudo -E bash -
            sudo yum clean all
            sudo yum -q -y install nodejs
        fi
    fi
    # run npm once as the unprivileged user so it creates the ~/.config
    # directory with the unprivileged user as the owner, rather than as root
    # when we run the very first 'npm install' command later
    npm version >/dev/null 2>&1
}

# Create the perforce user and group, if permitted, and as needed.
function create_user_group() {
    # create perforce group as needed
    if ! getent group perforce >/dev/null; then
        sudo groupadd --system perforce
    fi

    # create perforce user as needed
    if ! getent passwd perforce >/dev/null; then
        sudo useradd --system --comment 'Perforce Admin' --shell /bin/bash \
            --gid perforce --home-dir "$HOMEDIR" perforce
    fi

    # create home directory and set ownership as needed
    [ ! -d "$HOMEDIR" ] && sudo mkdir -p "$HOMEDIR"
    sudo chown -R perforce:perforce "$HOMEDIR"

    # ensure perforce user can write to the installation path
    INSTALL_PREFIX=$(pwd)
    sudo chown -R perforce:perforce "$INSTALL_PREFIX"

    if ! sudo su - perforce -c "ls ${INSTALLPREFIX}" >/dev/null 2>&1; then
        error "\n\nUser perforce cannot access ${INSTALLPREFIX}, please fix permissions.\n"
        echo -e "For example, invoke 'chmod 755 $(dirname ${INSTALLPREFIX})' as the root user.\n"
    fi
}

# Create the systemd service unit, enable, and start.
function install_service_unit() {
    INSTALL_PREFIX=$(pwd)
    sudo tee /etc/systemd/system/helix-auth.service >/dev/null <<__SERVICE_UNIT__
[Unit]
Description=Helix Authentication Service
After=network.target

[Service]
Type=simple
Restart=always
ExecStart=${INSTALL_PREFIX}/bin/www.js
WorkingDirectory=${INSTALL_PREFIX}

[Install]
WantedBy=multi-user.target
__SERVICE_UNIT__
    # create an example .env file if missing
    if ! test -f .env; then
        # strip comments and blank lines
        awk "/^$/{next} /^#/{next} {print}" example.env | sudo tee .env >/dev/null
        sudo chown --reference=example.env .env
    fi
    if which systemctl >/dev/null 2>&1; then
        sudo systemctl daemon-reload
        sudo systemctl enable helix-auth.service
        sudo systemctl start helix-auth.service
    else
        error 'The systemctl utility was not found in the PATH.'
        error 'You will need to start the helix-auth.service like so:'
        error '  $ sudo systemctl daemon-reload'
        error '  $ sudo systemctl enable helix-auth.service'
        error '  $ sudo systemctl start helix-auth.service'
    fi
}

# Fetch and build the application dependencies.
function install_modules() {
    if ! test -f package.json; then
        die 'Missing package.json file for authentication service'
    fi
    echo "Building dependencies for auth service..."
    if test -f package-lock.json; then
        npm ci -q --omit=dev
    else
        npm i -q --omit=dev
    fi
}

# Install pm2 globally and install into system start-up procedure.
function install_pm2() {
    if ! which pm2 >/dev/null 2>&1; then
        echo "Installing pm2 globally..."
        sudo npm install -q -g pm2
    fi
    echo "Starting the auth service with default configuration..."
    # For consistency with the configure script, assume that the service will be
    # run as the unprivileged user, rather than root.
    pm2 start ecosystem.config.cjs
    echo "Installing pm2 startup script..."
    STARTUP=$(pm2 startup | awk '/\[PM2\] Init System found:/ { print $5 }')
    sudo pm2 startup ${STARTUP} -u ${USER} --hp ${HOME}
    pm2 save
}

# Print a summary of what was done and any next steps.
function print_summary() {
    highlight_on
    if $INSTALL_PM2; then
        cat <<EOT

===============================================================================
Automated install complete! Now a few final bits to do manually.
===============================================================================

The Helix Authentication Service is now running via the pm2 process manager.
Use the command 'pm2 status' to get the status of the service.

To configure the service, edit the file shown below, and then restart the
service: pm2 reload ${INSTALLPREFIX}/ecosystem.config.cjs

    ${INSTALLPREFIX}/ecosystem.config.cjs

The configure-auth-service.sh script can be used to make changes to the
configuration in both an interactive and automated fashion.

    ${INSTALLPREFIX}/bin/configure-auth-service.sh --help

For assistance, please contact support@perforce.com
EOT
    else
        cat <<EOT

===============================================================================
Automated install complete! Now a few final bits to do manually.
===============================================================================

The Helix Authentication Service is now running via systemd using the service
name 'helix-auth'. Use the command 'sudo systemctl status helix-auth' to get
the status of the service.

To configure the service, edit the .env file in the directory shown below, and
then restart the service: sudo systemctl restart helix-auth

    ${INSTALLPREFIX}

In particular, the settings to be changed are the OIDC and/or SAML settings
for your identity provider. The configure-auth-service.sh script may be
helpful for this purpose.

    ${INSTALLPREFIX}/bin/configure-auth-service.sh --help

For assistance, please contact support@perforce.com
EOT
    fi
    highlight_off
}

function main() {
    # move to the source directory before everything else
    cd "$( cd "$(dirname "$0")" ; pwd -P )"
    INSTALLPREFIX=$(pwd)
    set -e
    read_arguments "$@"
    ensure_readiness
    check_nodejs
    if $INTERACTIVE; then
        display_interactive
        prompt_to_proceed
    fi
    install_nodejs
    install_modules
    if $INSTALL_PM2; then
        install_pm2
    else
        if $CREATE_USER; then
            create_user_group
        fi
        install_service_unit
    fi
    print_summary
}

main "$@"

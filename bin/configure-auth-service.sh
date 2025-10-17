#!/usr/bin/env bash
#
# Convenience script for invoking the real configuration script.
#
# Copyright 2024, Perforce Software Inc. All rights reserved.
#
MONOCHROME=false

# Print arguments to STDERR and exit.
function die() {
    error "FATAL: $*" >&2
    exit 1
}

# Print the first argument in red text on STDERR.
function error() {
    $MONOCHROME || echo -e "\033[31m$1\033[0m" >&2
    $MONOCHROME && echo -e "$1" >&2 || true
}

# Print the first argument in yellow text on STDERR.
function warning() {
    $MONOCHROME || echo -e "\033[33m$1\033[0m" >&2
    $MONOCHROME && echo -e "$1" >&2 || true
}

# Ensure OS is compatible and dependencies are already installed.
function ensure_readiness() {
    if ! command -v node >/dev/null 2>&1 || ! node --version | grep -Eq '^v(20|22)\.'; then
        error 'Node.js v20 or v22 is required to run the service.'
        error 'Please run install.sh to install dependencies.'
        exit 1
    fi
    if [[ ! -d node_modules ]]; then
        die 'Module dependencies are missing. Please run install.sh before proceeding.'
    fi
}

function main() {
    # move to the source directory before everything else
    cd "$( cd "$(dirname "$0")" ; pwd -P )/.."
    # include our bin in case node can be found there
    export PATH=$(pwd)/bin:${PATH}
    set -e
    ensure_readiness
    node ./bin/configure-auth-service.js "$@"
}

main "$@"

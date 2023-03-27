#!/usr/bin/env bash
#
# Configuration script for Helix Authentication Service.
#
# Copyright 2022, Perforce Software Inc. All rights reserved.
#
INTERACTIVE=true
MONOCHROME=false
ALLOW_ROOT=false
SVC_RESTARTED=false
DEBUG=false
SVC_BASE_URI=''
ADMIN_ENABLED=''
ADMIN_USERNAME=''
ADMIN_PASSWD=''
ADMIN_PASSWD_FILE='admin-passwd.txt'
CONFIGURE_AUTH=true
CONFIGURE_SCIM=true
declare -A PROTOCOLS=()
DEFAULT_PROTOCOL=''
SAML_IDP_METADATA_URL=''
SAML_IDP_SSO_URL=''
SAML_SP_ENTITY_ID=''
OIDC_ISSUER_URI=''
OIDC_CLIENT_ID=''
OIDC_CLIENT_SECRET=''
OIDC_CLIENT_SECRET_FILE='client-secret.txt'
FOUND_P4=true
BEARER_TOKEN=''
P4PORT=''
P4USER=''
P4PASSWD=''
INJECT_P4TRUST=false
P4D_MIN_CHANGE='1797576'
P4D_MIN_VERSION='2019.1'
CONFIG_FILE_NAME='.env'

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

# Print the argument in green text.
function highlight() {
    $MONOCHROME || echo -e "\033[32m$1\033[0m"
    $MONOCHROME && echo -e "$1" || true
}

# Print the input validation error in red text on STDERR.
function error_prompt() {
    if $INTERACTIVE; then
        error "$@"
    fi
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

# Print the first argument in blue text on STDERR.
function debug() {
    $DEBUG || return 0
    $MONOCHROME || echo -e "\033[33m$1\033[0m" >&2
    $MONOCHROME && echo -e "$1" >&2 || true
}

# Prompt the user for information by showing a prompt string. Optionally
# calls a validation function to check if the response is OK.
#
# prompt_for <VAR> <prompt> <default> [<validationfunc>]
function prompt_for() {
    local var="$1"
    local prompt="$2"
    local default="$3"
    local check_func=true

    [[ -n "$4" ]] && check_func=$4
    [[ "$default" =~ ^[[:space:]]+$ ]] && default=''

    while true; do
        local input=''
        if [[ -n "$default" ]]; then
            read -e -p "$prompt [$default]: " input
            if [[ -z "$input" ]]; then
                input=$default
            fi
        else
            read -e -p "$prompt: " input
        fi
        if $check_func "$input"; then
            eval "$var=\"$input\""
            break
        fi
    done
    return 0
}

# Prompt the user for a password that will be verified soon after, and thus only
# one prompt is issued.
function prompt_for_password() {
    local var="$1"
    local prompt="$2"
    local default="$3"
    local check_func=true

    [[ -n "$4" ]] && check_func=$4
    [[ "$default" =~ ^[[:space:]]+$ ]] && default=''

    while true; do
        local pw=''
        local pw2=''
        if [[ -n "$default" ]]; then
            # conceal the length of the incoming password
            read -s -e -p "$prompt [************]: " pw
            if [[ -z "$pw" ]]; then
                pw=$default
            fi
        else
            read -s -e -p "$prompt: " pw
        fi
        echo ''
        if $check_func "$pw"; then
            if [[ -n "$default" ]]; then
                break
            fi
            # No need to prompt again, the credentials will be checked
            # immediately rather than after receiving all user input.
            eval "$var=\"$pw\""
            break
        fi
    done
    return 0
}

# Prompt the user for a secret value two times and compare values, ensuring they
# match, as the value will not be verified by this script.
function prompt_for_secret() {
    local var="$1"
    local prompt="$2"
    local default="$3"
    local check_func=true

    [[ -n "$4" ]] && check_func=$4
    [[ "$default" =~ ^[[:space:]]+$ ]] && default=''

    while true; do
        local pw=''
        local pw2=''
        if [[ -n "$default" ]]; then
            # conceal the length of the incoming password
            read -s -e -p "$prompt [************]: " pw
            if [[ -z "$pw" ]]; then
                pw=$default
            fi
        else
            read -s -e -p "$prompt: " pw
        fi
        echo ''
        if $check_func "$pw"; then
            if [[ -n "$default" && "$pw" == "$default" ]]; then
                break
            fi
            read -s -e -p "Re-enter new secret value: " pw2
            echo ''
            if [[ "$pw" == "$pw2" ]]; then
                eval "$var=\"$pw\""
                break
            else
                echo 'Secret values do not match. Please try again.'
            fi
        fi
    done
    return 0
}

# Display the given prompt and prompt for a yes/no response.
function prompt_for_yn() {
    local var="$1"
    local prompt="$2"
    local default="$3"

    [[ "$default" =~ ^[[:space:]]+$ ]] && default=''

    # read the yes/no input like any other input
    local input=''
    if [[ -n "$default" ]]; then
        read -e -p "$prompt [$default]: " input
        if [[ -z "$input" ]]; then
            input=$default
        fi
    else
        read -e -p "$prompt: " input
    fi

    # coerce the input value into either a 'yes' or a 'no'
    case $input in
        [yY][eE][sS]|[yY])
            eval "$var='yes'"
            ;;
        *)
            eval "$var='no'"
            ;;
    esac
    return 0
}

# Print the usage text to STDOUT.
function usage() {
    cat <<EOS

Usage:

    configure-auth-service.sh [-n] [-m] ...

Description:

    Configuration script for Helix Authentication Service.

    This script will modify the .env file according to the values provided
    via arguments or interactive input, and then restart the service using
    the systemctl command.

    -h / --help
        Display this help message.

    -m
        Monochrome; no colored text.

    -n
        Non-interactive mode; exits immediately if prompting is required.

    --admin-user <username>
        If given, along with --admin-passwd, will configure the service to
        provide an administrative web interface.

    --admin-passwd <password>
        If given, along with the --admin-user, will configure the service to
        provide an administrative web interface.

    --allow-root
        Allow the root user to run the configure script. This may leave
        some files owned and readable only by the root user, which can
        cause other problems. Similarly, the P4TRUST and P4TICKETS values
        may reference the root user's home directory.

    --base-url <base-url>
        HTTP/S address of this service.

    --bearer-token <token>
        HTTP Bearer token for authentication of SCIM requests.

    --debug
        Enable debugging output for this configuration script.

    --default-protocol <protocol>
        Set the default protocol to be used when a client application does
        not specify a protocol to be used. This option only applies when
        configuring more than one protocol.

    --enable-admin
        Enable the administrative web interface. Requires the --admin-user
        and --admin-passwd options to complete the configuration. This feature
        is incomplete and untested, use with caution.

    --oidc-issuer-uri <issuer-uri>
        Issuer URI for the OpenID Connect identity provider.

    --oidc-client-id <client-id>
        Client identifier for connecting to OIDC identity provider.

    --oidc-client-secret <client-secret>
        Client secret associated with the OIDC client identifier.

    --p4port <p4port>
        The P4PORT for the Helix Core server for user provisioning.

    --saml-idp-metadata-url <metdata-url>
        URL for the SAML identity provider configuration metadata.

    --saml-idp-sso-url <sso-url>
        URL for the SAML identity provider SSO endpoint.

    --saml-sp-entityid <entity-id>
        SAML entity identifier for this service.

    --super <username>
        Helix Core super user's username for user provisioning.

    --superpassword <password>
        Helix Core super user's password for user provisioning.

See the Helix Authentication Service Administrator Guide for additional
information pertaining to configuring and running the service.

EOS
}

# Echo the array inputs separated by the first argument.
function join_by() {
    local IFS="$1"; shift; echo "$*";
}

# Validate the given argument is not empty, returning 0 if okay, 1 otherwise.
function validate_nonempty() {
    if [[ -z "$1" ]]; then
        error_prompt 'Please enter a value.'
        return 1
    fi
    return 0
}

# Validate the given argument as a URL, returning 0 if okay, 1 otherwise.
function validate_url() {
    local URLRE='^https?://.+'
    if [[ -z "$1" ]] || [[ ! "$1" =~ $URLRE ]]; then
        error_prompt 'Please enter a valid URL.'
        return 1
    fi
    return 0
}

# Validate the given argument as a URL, if not blank.
function optional_url() {
    local URLRE='^https?://.+'
    if [[ -n "$1" ]] && [[ ! "$1" =~ $URLRE ]]; then
        error_prompt 'Please enter a valid URL.'
        return 1
    fi
    return 0
}

# Validate the given argument as an HTTPS URL.
function validate_https_url() {
    local URLRE='^https://.+'
    if [[ -z "$1" ]] || [[ ! "$1" =~ $URLRE ]]; then
        error_prompt 'Please enter a valid HTTPS URL.'
        return 1
    fi
    return 0
}

# Validate the selected default protocol (either 'saml' or 'oidc').
function validate_protocol() {
    if [[ "$1" == 'oidc' || "$1" == 'saml' ]]; then
        return 0
    fi
    error 'Enter either "oidc" or "saml" for default protocol.'
    return 1
}

# Validate first argument represents a valid P4PORT value.
function validate_p4port() {
    local PORT=$1
    local PROTOS='tcp tcp4 tcp6 tcp46 tcp64 ssl ssl4 ssl6 ssl46 ssl64'
    local PROTO=''
    local HOST=''
    local PNUM=''

    # extract the port number, if any
    local BITS=(${PORT//:/ })
    local COUNT=${#BITS[@]}
    if [[ $COUNT -eq 1 ]]; then
        PNUM=${BITS[0]}
    elif [[ $COUNT -eq 2 ]]; then
        [[ $PROTOS =~ ${BITS[0]} ]] && PROTO=${BITS[0]} || HOST=${BITS[0]}
        PNUM=${BITS[1]}
    elif [[ $COUNT -eq 3 ]]; then
        PROTO=${BITS[0]}
        HOST=${BITS[1]}
        PNUM=${BITS[2]}
    elif [[ $COUNT -gt 3 ]]; then
        error "Too many parts in P4PORT: $PORT"
        return 1
    fi

    if [[ -n "$PROTO" ]] && [[ ! $PROTOS =~ $PROTO ]]; then
        error "Invalid Helix protocol: $PROTO"
        return 1
    fi

    # check port range (port >= 1024 && port <= 65535)
    # see http://www.iana.org/assignments/port-numbers for details
    local NUMRE='^[0-9]+$'
    if [[ ! $PNUM =~ $NUMRE ]] || [ $PNUM -lt 1024 -o $PNUM -gt 65535 ]; then
        error "Port number out of range (1024-65535): $PNUM"
        return 1
    fi
    return 0
}

# Validate first argument represents a valid Perforce username.
function validate_p4user() {
    local USERRE='^[a-zA-Z]+'
    if [[ -z "$1" ]] || [[ ! "$1" =~ $USERRE ]]; then
        error 'Username must start with a letter.'
        return 1
    fi
    return 0
}

# Ensure OS is compatible and dependencies are already installed.
function ensure_readiness() {
    if [[ $EUID -eq 0 ]] && ! $ALLOW_ROOT; then
        die 'This script should be run as a non-root user.'
    fi

    # Ensure write access to the configuration file.
    if ! touch CHANGELOG.md >/dev/null 2>&1; then
        die 'You do not have permission to write to this directory.'
    fi
    if ! which node >/dev/null 2>&1 || ! node --version | grep -Eq '^v1(4|6|8)\.'; then
        error 'Node.js v14, v16, or v18 is required to run the service.'
        error 'Please run install.sh to install dependencies.'
        exit 1
    fi
    if [[ ! -d node_modules ]]; then
        die 'Module dependencies are missing. Please run install.sh before proceeding.'
    fi
    if ! which p4 >/dev/null 2>&1; then
        FOUND_P4=false
        CONFIGURE_SCIM=false
        warning 'Perforce client "p4" is required for user provisioning.'
    fi
}

# Source selected P4 settings by use of the p4 set command.
function source_enviro() {
    if $FOUND_P4; then
        if [ -n "$(p4 set -q P4PORT)" ]; then
            eval "$(p4 set -q P4PORT)"
        fi
        if [ -n "$(p4 set -q P4USER)" ]; then
            eval "$(p4 set -q P4USER)"
        fi
    fi
}

function read_arguments() {
    # build up the list of arguments in pieces since there are so many
    local ARGS=(bearer-token: p4port: super: superpassword: base-url:)
    ARGS+=(admin-user: admin-passwd: enable-admin)
    ARGS+=(oidc-issuer-uri: oidc-client-id: oidc-client-secret:)
    ARGS+=(saml-idp-sso-url: saml-sp-entityid: saml-idp-metadata-url:)
    ARGS+=(default-protocol: allow-root debug help)
    local TEMP=$(getopt -n 'configure-auth-service.sh' \
        -o 'hmn' \
        -l "$(join_by , ${ARGS[@]})" -- "$@")
    if (( $? != 0 )); then
        usage
        exit 1
    fi

    # Re-inject the arguments from getopt, so now we know they are valid and in
    # the expected order.
    eval set -- "$TEMP"
    while true; do
        case "$1" in
            -h)
                usage
                exit 0
                ;;
            -m)
                MONOCHROME=true
                shift
                ;;
            -n)
                INTERACTIVE=false
                shift
                ;;
            --admin-user)
                ADMIN_USERNAME=$2
                shift 2
                ;;
            --admin-passwd)
                ADMIN_PASSWD=$2
                shift 2
                ;;
            --base-url)
                SVC_BASE_URI=$2
                shift 2
                ;;
            --bearer-token)
                BEARER_TOKEN=$2
                shift 2
                ;;
            --enable-admin)
                ADMIN_ENABLED='yes'
                shift
                ;;
            --p4port)
                P4PORT=$2
                shift 2
                ;;
            --super)
                P4USER=$2
                shift 2
                ;;
            --superpassword)
                P4PASSWD=$2
                shift 2
                ;;
            --oidc-issuer-uri)
                OIDC_ISSUER_URI=$2
                shift 2
                ;;
            --oidc-client-id)
                OIDC_CLIENT_ID=$2
                shift 2
                ;;
            --oidc-client-secret)
                OIDC_CLIENT_SECRET=$2
                shift 2
                ;;
            --saml-idp-metadata-url)
                SAML_IDP_METADATA_URL=$2
                shift 2
                ;;
            --saml-idp-sso-url)
                SAML_IDP_SSO_URL=$2
                shift 2
                ;;
            --saml-sp-entityid)
                SAML_SP_ENTITY_ID=$2
                shift 2
                ;;
            --default-protocol)
                DEFAULT_PROTOCOL=$2
                shift 2
                ;;
            --allow-root)
                ALLOW_ROOT=true
                shift
                ;;
            --debug)
                DEBUG=true
                shift
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

    # spurious arguments that are not supported by this script
    if (( $# != 0 )); then
        usage
        exit 1
    fi
}

# Show the argument values already provided.
function display_arguments() {
    highlight_on
    cat <<EOT
Summary of arguments passed:

Service base URL               [${SVC_BASE_URI:-(not specified)}]
Administrative user            [${ADMIN_USERNAME:-(not specified)}]
OIDC Issuer URI                [${OIDC_ISSUER_URI:-(not specified)}]
OIDC Client ID                 [${OIDC_CLIENT_ID:-(not specified)}]
SAML IdP Metadata URL          [${SAML_IDP_METADATA_URL:-(not specified)}]
SAML IdP SSO URL               [${SAML_IDP_SSO_URL:-(not specified)}]
SAML SP Entity ID              [${SAML_SP_ENTITY_ID:-(not specified)}]
Helix server P4PORT            [${P4PORT:-(not specified)}]
Helix super-user               [${P4USER:-(not specified)}]

For a list of other options, type Ctrl-C to exit, and run this script with
the --help option.

EOT
    highlight_off
}

# Show a message about the interactive configuration procedure.
function display_interactive() {
    highlight_on
    cat <<EOT
You have entered interactive configuration for the service. This script will
ask a series of questions, and use your answers to configure the service for
first time use. Options passed in from the command line or automatically
discovered in the environment are presented as defaults. You may press enter
to accept them, or enter an alternative.
EOT
    highlight_off
}

# Prompt for the URL of the authentication service.
function prompt_for_svc_base_uri() {
    cat <<EOT


The URL of this service, which must be visible to end users. It must match
the application settings defined in the IdP configuration. The URL must
begin with either http: or https:, and maybe include a port number. If the
URL contains a port number, then the service will listen for connections
on that port.

It is strongly recommended to use HTTPS over HTTP as many browsers will not
send cookies over an insecure connection when using OIDC/SAML protcols.

Example: https://has.example.com:3000/

EOT
    prompt_for SVC_BASE_URI 'Enter the URL for this service' "${SVC_BASE_URI}" validate_url
}

# Prompt for the choice of using the administrative web interface to configure
# the service, or configuring everything with this script.
function prompt_for_gui_or_cli() {
    cat <<EOT


This service can be configured using this script, or the service can be
configured to enable an administrative web interface. If the web interface
is enabled, then the configuration can be performed there.

If you choose to enable the web interface, be aware that anyone that can
access the service can attempt to connect to the administrative interface.
Choosing a strong password is important.

It is strongly recommended that the service URL use HTTPS instead of HTTP
as the admin credentials and JSON web token are sent over the network.

EOT
    prompt_for_yn ADMIN_ENABLED 'Do you want to enable the admin interface?' "${ADMIN_ENABLED}"
}

function prompt_for_admin_creds() {
    cat <<EOT


To enable the administrative web interface, please choose a username and
password that will be used to authenticate the administrator. Neither the
name nor the password have any relation to other applications, they are
strictly for accessing the administrative web interface.

EOT
    prompt_for ADMIN_USERNAME 'Enter a username for the admin user' "${ADMIN_USERNAME}" validate_nonempty
    prompt_for_password ADMIN_PASSWD 'Enter a password for the admin user' "${ADMIN_PASSWD}"
}

# Prompt for which features are to be configured.
function prompt_for_auth_scim() {
    cat <<EOT


The service can support authentication integration or user provisioning,
as well as both features simultaneously. Please choose which features you
wish to configure from the options below.

EOT
    select feature in 'Authentication' 'Provisioning' 'Both'; do
        case $feature in
            Authentication)
                CONFIGURE_AUTH=true
                CONFIGURE_SCIM=false
                break
                ;;
            Provisioning)
                CONFIGURE_AUTH=false
                CONFIGURE_SCIM=true
                break
                ;;
            Both)
                CONFIGURE_AUTH=true
                CONFIGURE_SCIM=true
                break
                ;;
            *)
                echo 'Please select an option'
                ;;
        esac
    done
}

# Prompt for which protocols to configure (e.g. OIDC, SAML, both).
function prompt_for_protocols() {
    cat <<EOT


The service can support both OpenID Connect and SAML 2.0, as well as both
protocols simultaneously. Please choose which protocols you wish to
configure from the options below.

EOT
    select protocol in 'OIDC' 'SAML' 'Both'; do
        case $protocol in
            OIDC)
                PROTOCOLS['oidc']=1
                break
                ;;
            SAML)
                PROTOCOLS['saml']=1
                break
                ;;
            Both)
                PROTOCOLS['oidc']=1
                PROTOCOLS['saml']=1
                break
                ;;
            *)
                echo 'Please select an option'
                ;;
        esac
    done
}

# Prompt for which protocol to configure as the default.
function prompt_for_default_protocol() {
    cat <<EOT


You chose to configure multiple protocols. Some client applications may
not indicate which protocol they want to use, and the service will use a
default protocol in that case.

Accepted values are 'oidc' and 'saml'.

EOT
    prompt_for DEFAULT_PROTOCOL 'Enter the default protocol' "${DEFAULT_PROTOCOL}" validate_protocol
}

# Prompt for the SAML IdP metadata URL.
function prompt_for_saml_idp_metadata_url() {
    cat <<EOT


URL of the SAML identity provider metadata configuration in XML format.
This may help to configure several other SAML settings automatically.
If your identity provider does not provide a metadata URL, simply press
Enter and then provide a value for the SSO (single-sign-on) URL at the
next prompt.

Example: https://idp.example.com:8080/saml/metadata

EOT
    prompt_for SAML_IDP_METADATA_URL 'Enter the URL for SAML IdP metadata' "${SAML_IDP_METADATA_URL}" optional_url
}

# Prompt for the SAML IdP SSO URL.
function prompt_for_saml_idp_sso_url() {
    cat <<EOT


URL of SAML identity provider Single Sign-On service. If the metadata
already contains this value, you do not need to enter one here.

Example: https://idp.example.com/test-app-12345/sso/saml

EOT
    if [[ -n "${SAML_IDP_METADATA_URL}" ]]; then
        echo 'This value may be used to override the SSO URL in the SAML metadata.'
    fi
    prompt_for SAML_IDP_SSO_URL 'Enter the URL for SAML IdP SSO endpoint' "${SAML_IDP_SSO_URL}" optional_url
}

# Prompt for the SAML entity identifier of the service.
function prompt_for_saml_sp_entity_id() {
    cat <<EOT


The SAML entity identifier (entityID) for the Helix Authentication Service.
This value may be defined by the SAML identity provider (e.g. Azure). It is
important that this value matches exactly what is configured in the identity
provider, as it uniquely identifies the service application.

EOT
    prompt_for SAML_SP_ENTITY_ID 'Enter the SAML entity ID for service' "${SAML_SP_ENTITY_ID}"
}

# Prompt for the OIDC issuer URI.
function prompt_for_oidc_issuer_uri() {
    cat <<EOT


URI for the OIDC identity provider issuer, typically a URL. This value will
always begin with https: as that is required by the OIDC standard.

Example: https://oidc.example.com/

EOT
    prompt_for OIDC_ISSUER_URI 'Enter the URI for OIDC issuer' "${OIDC_ISSUER_URI}" validate_https_url
}

# Prompt for the OIDC client identifier.
function prompt_for_oidc_client_id() {
    cat <<EOT


The client identifier as provided by the OIDC identity provider.

EOT
    prompt_for OIDC_CLIENT_ID 'Enter the OIDC client ID' "${OIDC_CLIENT_ID}" validate_nonempty
}

# Prompt for the OIDC client secret.
function prompt_for_oidc_client_secret() {
    cat <<EOT


The client secret as provided by the OIDC identity provider.

EOT
    prompt_for_secret OIDC_CLIENT_SECRET 'Enter the OIDC client secret' "${OIDC_CLIENT_SECRET}" validate_nonempty
}

# Prompt for the HTTP Bearer token.
function prompt_for_bearer_token() {
    cat <<EOT


The SCIM cloud service provider will authenticate using an HTTP Bearer
token. This same value must be provided to the cloud service provider,
typically in base64-encoded form.

EOT
    prompt_for BEARER_TOKEN 'Enter the bearer token' "${BEARER_TOKEN}" validate_nonempty
}

# Prompt for the P4PORT of the Helix Core server.
function prompt_for_p4port() {
    prompt_for P4PORT 'Enter the P4PORT of the Helix server' "${P4PORT}" validate_p4port
}

# Prompt for the name of the Perforce super user.
function prompt_for_p4user() {
    prompt_for P4USER 'Enter the username of the super user' "${P4USER}" validate_p4user
}

# Prompt for the password of the Perforce super user.
function prompt_for_p4passwd() {
    prompt_for_password P4PASSWD 'Enter the password of the super user' "${P4PASSWD}"
}

# Prompt for authentication inputs.
function prompt_for_auth_inputs() {
    prompt_for_protocols
    if [[ -n "${PROTOCOLS['oidc']}" ]]; then
        prompt_for_oidc_issuer_uri
        prompt_for_oidc_client_id
        prompt_for_oidc_client_secret
    fi
    if [[ -n "${PROTOCOLS['saml']}" ]]; then
        prompt_for_saml_idp_metadata_url
        prompt_for_saml_idp_sso_url
        prompt_for_saml_sp_entity_id
    fi
    # ensure correct default protocol (if read from file)
    if [[ -n "${DEFAULT_PROTOCOL}" ]]; then
        if [[ "${DEFAULT_PROTOCOL}" != 'oidc' && "${DEFAULT_PROTOCOL}" != 'saml' ]]; then
            prompt_for_default_protocol
        fi
    fi
    # If configuring multiple protocols, or if they appear to configuring one
    # protocol that is not the default protocol configured previously, then
    # prompt them for the new default.
    if (( ${#PROTOCOLS[@]} > 1 )); then
        prompt_for_default_protocol
    elif [[ "${DEFAULT_PROTOCOL}" == 'saml' && -n "${PROTOCOLS['oidc']}" ]]; then
        prompt_for_default_protocol
    elif [[ "${DEFAULT_PROTOCOL}" == 'oidc' && -n "${PROTOCOLS['saml']}" ]]; then
        prompt_for_default_protocol
    fi
}

# Prompt for user provisioning inputs.
function prompt_for_scim_inputs() {
    cat <<EOT

The user provisioning feature will need the Helix Core Server address
and credentials for a super user that can manage users and groups.

EOT
    prompt_for_p4port
    while ! check_perforce_server; do
        prompt_for_p4port
    done
    prompt_for_p4user
    prompt_for_p4passwd
    while ! check_perforce_super_user; do
        prompt_for_p4user
        # Clear the password so prompt_for_password will behave as if no
        # password has yet been provided (which is partially true).
        P4PASSWD=''
        prompt_for_p4passwd
    done
    prompt_for_bearer_token
}

# Prompt for inputs.
function prompt_for_inputs() {
    prompt_for_svc_base_uri
    # turn off administrative ui prompt for now
    # prompt_for_gui_or_cli
    if [[ "${ADMIN_ENABLED}" == 'yes' ]]; then
        prompt_for_admin_creds
    else
        # configuring authentication, provisioning, or both?
        prompt_for_auth_scim
        if $CONFIGURE_SCIM; then
            prompt_for_scim_inputs
        fi
        if $CONFIGURE_AUTH; then
            prompt_for_auth_inputs
        fi
    fi
}

function validate_admin_creds() {
    if [[ -z "${ADMIN_USERNAME}" ]]; then
        error 'An administrative username must be provided.'
        return 1
    fi
    if [[ -z "${ADMIN_PASSWD}" ]]; then
        error 'An administrative password must be provided.'
        return 1
    fi
    return 0
}

# Validate inputs for the authentication integration.
function validate_auth_inputs() {
    #
    # Validate OIDC/SAML settings only if the user chose to provide those
    # settings during this particular run of the script (i.e. they may be
    # running the script a second time and choosing to switch protocols).
    #
    if [[ -n "${PROTOCOLS['oidc']}" ]]; then
        if [[ -z "${OIDC_ISSUER_URI}" && -z "${SAML_IDP_SSO_URL}" && -z "${SAML_IDP_METADATA_URL}" ]]; then
            error 'Either OIDC or SAML identity provider settings must be provided.'
            return 1
        fi
        if [[ -n "${OIDC_ISSUER_URI}" ]]; then
            if [[ -z "${OIDC_CLIENT_ID}" ]]; then
                error 'An OIDC client identifier must be provided.'
                return 1
            fi
            if [[ -z "${OIDC_CLIENT_SECRET}" ]]; then
                error 'An OIDC client secret must be provided.'
                return 1
            fi
        fi
    fi
    if [[ -n "${PROTOCOLS['saml']}" ]]; then
        if [[ -n "${SAML_IDP_SSO_URL}" ]] && ! validate_url "${SAML_IDP_SSO_URL}"; then
            error 'A valid SAML IdP SSO URL must be provided.'
            return 1
        fi
        if [[ -n "${SAML_IDP_METADATA_URL}" ]] && ! validate_url "${SAML_IDP_METADATA_URL}"; then
            error 'A valid SAML IdP metadata URL must be provided.'
            return 1
        fi
    fi
    if [[ -n "${DEFAULT_PROTOCOL}" ]]; then
        if [[ "${DEFAULT_PROTOCOL}" != 'oidc' && "${DEFAULT_PROTOCOL}" != 'saml' ]]; then
            error 'Default protocol must be either OIDC or SAML.'
            return 1
        fi
        if [[ "${DEFAULT_PROTOCOL}" == 'oidc' && -z "${OIDC_CLIENT_ID}" ]]; then
            error 'Must configure OIDC if using it as the default protocol.'
            return 1
        fi
        if [[ "${DEFAULT_PROTOCOL}" == 'saml' && -z "${SAML_IDP_SSO_URL}" && -z "${SAML_IDP_METADATA_URL}" ]]; then
            error 'Must configure SAML if using it as the default protocol.'
            return 1
        fi
    fi
    return 0
}

# Ensure the Helix server is running.
function check_perforce_server() {
    if [ -z "$P4PORT" ]; then
        error 'No P4PORT specified'
        return 1
    fi

    local SSLRE="^ssl"
    local BITS=(${P4PORT//:/ })
    if [[ ${BITS[0]} =~ $SSLRE ]]; then
        p4 -p "$P4PORT" trust -f -y >/dev/null 2>&1
        if (( $? != 0 )); then
            error "Unable to trust the server [$P4PORT]"
            return 1
        fi
        INJECT_P4TRUST=true
    fi

    local P4INFO=""
    if ! P4INFO=$(p4 -p "$P4PORT" -ztag info 2>/dev/null); then
        error "Unable to connect to Helix server [$P4PORT]"
        return 1
    fi

    # Divide the server version into parts that can be easily analyzed.
    local SERVER_VERSION="$(echo "$P4INFO" | grep -F '... serverVersion')"
    IFS=' ' read -r -a PARTS <<< "${SERVER_VERSION}"
    IFS='/' read -r -a PIECES <<< "${PARTS[2]}"
    local P4D_REL="${PIECES[2]}"
    local P4D_CHANGE="${PIECES[3]}"
    if [ "$(awk 'BEGIN{ if ("'$P4D_REL'" < "'$P4D_MIN_VERSION'") print(1); else print(0) }')" -eq 1 ] || \
       [ -n "$P4D_MIN_CHANGE" -a "$P4D_CHANGE" -lt "${P4D_MIN_CHANGE}" ]; then
        error "This Helix server $P4D_REL/$P4D_CHANGE is not supported by Auth Extension."
        error "Auth Extension supports Helix servers starting with [$P4D_MIN_VERSION]/[${P4D_MIN_CHANGE}]"
        return 1
    fi
}

# Ensure the user credentials provided are valid and confer super access.
function check_perforce_super_user() {
    if [ -z "$P4PORT" -o -z "$P4USER" ]; then
        error 'No P4PORT or P4USER specified'
        return 1
    fi

    if [[ -z "$P4PASSWD" || "$P4PASSWD" =~ ^[[:blank:]]*$ ]]; then
        echo "P4PASSWD is empty or is whitespace. Skipping Helix server login."
    else
        if ! echo "$P4PASSWD" | p4 -p "$P4PORT" -u "$P4USER" login >/dev/null 2>&1; then
            error "Unable to login to the Helix server '$P4PORT' as '$P4USER' with supplied password"
            return 1
        fi
    fi

    if ! p4 -p "$P4PORT" -u "$P4USER" protects -m 2>&1 | grep -q 'super'; then
        error "User '$P4USER' must have super privileges"
        return 1
    fi
    return 0
}

# Validate inputs for the user provisioning feature.
function validate_scim_inputs() {
    if ! validate_p4port "${P4PORT}"; then
        return 1
    fi
    if ! check_perforce_server; then
        return 1
    fi
    if ! validate_p4user "${P4USER}"; then
        return 1
    fi
    if ! check_perforce_super_user; then
        return 1
    fi
    return 0
}

# Validate all of the inputs however they may have been provided.
function validate_inputs() {
    if ! validate_url "$SVC_BASE_URI"; then
        error 'A valid base URL for the service must be provided.'
        return 1
    fi
    if [[ "${ADMIN_ENABLED}" == 'yes' ]]; then
        validate_admin_creds
    fi
    if $CONFIGURE_AUTH; then
        validate_auth_inputs
    fi
    if $CONFIGURE_SCIM; then
        validate_scim_inputs
    fi
    return 0
}

# Normalize the user inputs.
function clean_inputs() {
    if [[ -n "$SVC_BASE_URI" ]]; then
        # trim trailing slashes
        SVC_BASE_URI="$(echo -n "$SVC_BASE_URI" | sed 's,[/]*$,,')"
    fi
    if [[ -n "${SAML_IDP_SSO_URL}" || -n "${SAML_IDP_METADATA_URL}" ]]; then
        # set a default value for SAML_SP_ENTITY_ID
        if [[ -z "${SAML_SP_ENTITY_ID}" ]]; then
            SAML_SP_ENTITY_ID=${SVC_BASE_URI}
        fi
    fi
}

# Print what this script will do.
function print_preamble() {
    cat <<EOT

The script is ready to make the configuration changes.

The operations involved are as follows:

EOT
    echo "  * Set SVC_BASE_URI to ${SVC_BASE_URI}"
    if [[ -n "${ADMIN_USERNAME}" ]]; then
        echo '  * Enable the administrative web interface'
        echo "  * Set ADMIN_USERNAME to ${ADMIN_USERNAME}"
    fi
    if [[ -n "${ADMIN_PASSWD}" ]]; then
        echo "  * Set ADMIN_PASSWD_FILE to ${ADMIN_PASSWD_FILE}"
        echo '    (the file will contain the admin user password)'
    fi
    if [[ -n "${OIDC_ISSUER_URI}" ]]; then
        echo "  * Set OIDC_ISSUER_URI to ${OIDC_ISSUER_URI}"
    fi
    if [[ -n "${OIDC_CLIENT_ID}" ]]; then
        echo "  * Set OIDC_CLIENT_ID to ${OIDC_CLIENT_ID}"
    fi
    if [[ -n "${OIDC_CLIENT_SECRET}" ]]; then
        echo "  * Set OIDC_CLIENT_SECRET_FILE to ${OIDC_CLIENT_SECRET_FILE}"
        echo '    (the file will contain the client secret)'
    fi
    if [[ -n "${SAML_IDP_METADATA_URL}" ]]; then
        echo "  * Set SAML_IDP_METADATA_URL to ${SAML_IDP_METADATA_URL}"
    fi
    if [[ -n "${SAML_IDP_SSO_URL}" ]]; then
        echo "  * Set SAML_IDP_SSO_URL to ${SAML_IDP_SSO_URL}"
    fi
    if [[ -n "${SAML_SP_ENTITY_ID}" ]]; then
        echo "  * Set SAML_SP_ENTITY_ID to ${SAML_SP_ENTITY_ID}"
    fi
    if [[ -n "${DEFAULT_PROTOCOL}" ]]; then
        echo "  * Set DEFAULT_PROTOCOL to ${DEFAULT_PROTOCOL}"
    fi
    if [[ -n "${P4PORT}" ]]; then
        echo "  * Set P4PORT to ${P4PORT}"
    fi
    if [[ -n "${P4USER}" ]]; then
        echo "  * Set P4USER to ${P4USER}"
    fi
    if [[ -n "${P4PASSWD}" ]]; then
        echo "  * Set P4PASSWD to (hidden)"
    fi
    if [[ -n "${BEARER_TOKEN}" ]]; then
        echo "  * Set BEARER_TOKEN to ${BEARER_TOKEN}"
    fi
    echo -e "\nThe service will then be restarted.\n"
}

# Prompt user to proceed with or cancel the configuration.
function prompt_to_proceed() {
    echo 'Do you wish to continue?'
    select yn in 'Yes' 'No'; do
        case $yn in
            Yes) break ;;
            No) exit ;;
        esac
    done
}

# If not already set, read the value for the named variable from .env file.
function set_var_from_env() {
    # would have used 'local -n' but that is not universally available
    local var=$1
    local force_set=false
    [[ -n "$2" ]] && force_set=$2
    # awk has a hard time doing the simple things that grep and cut can do, so
    # must invoke multiple commands through pipes like a novice.
    VALUE=$(grep "^${1}=" .env | cut -d= -f2-)
    if [[ -n "${VALUE}" ]]; then
        VALUE=$(sed -e "s/^'//" -e "s/'$//" -e 's/^"//' -e 's/"$//' <<<"$VALUE")
        if $force_set || [[ -z "${!var}" ]]; then
            eval "$var=\"$VALUE\""
        fi
    fi
}

# Retrieve any existing service settings to prime the inputs.
function read_settings() {
    if [[ ! -f .env ]]; then
        return
    fi
    set_var_from_env 'P4PORT' true
    set_var_from_env 'P4USER' true
    set_var_from_env 'P4PASSWD' true
    set_var_from_env 'P4TICKETS'
    set_var_from_env 'P4TRUST'
    set_var_from_env 'BEARER_TOKEN'
    set_var_from_env 'DEFAULT_PROTOCOL'
    set_var_from_env 'SVC_BASE_URI'
    set_var_from_env 'OIDC_ISSUER_URI'
    set_var_from_env 'OIDC_CLIENT_ID'
    set_var_from_env 'OIDC_CLIENT_SECRET_FILE'
    if [ -n "${OIDC_CLIENT_SECRET_FILE}" -a -f "${OIDC_CLIENT_SECRET_FILE}" ]; then
        OIDC_CLIENT_SECRET=$(<${OIDC_CLIENT_SECRET_FILE})
    fi
    set_var_from_env 'OIDC_CLIENT_SECRET'
    set_var_from_env 'SAML_IDP_METADATA_URL'
    set_var_from_env 'SAML_IDP_SSO_URL'
    set_var_from_env 'SAML_SP_ENTITY_ID'
    set_var_from_env 'LOGGING'
    set_var_from_env 'ADMIN_ENABLED'
    if [[ "${ADMIN_ENABLED}" == 'true' ]]; then
        ADMIN_ENABLED='yes'
    else
        ADMIN_ENABLED='no'
    fi
    set_var_from_env 'ADMIN_USERNAME'
    set_var_from_env 'ADMIN_PASSWD_FILE'
    if [ -n "${ADMIN_PASSWD_FILE}" -a -f "${ADMIN_PASSWD_FILE}" ]; then
        ADMIN_PASSWD=$(<${ADMIN_PASSWD_FILE})
    fi
}

# Add, modify, or remove the named setting from the .env file.
function add_or_replace_var_in_env() {
    if [[ -n "${2}" ]]; then
        PRINT="print \"${1}=${2}\""
        awk "BEGIN {flg=0} /^${1}=/{flg=1; ${PRINT}; next} {print} END {if(flg==0) ${PRINT}}" .env > .tmp.env
    else
        awk "!/^${1}=/" .env > .tmp.env
    fi
    mv .tmp.env .env
}

# Make the prescribed changes to the dotenv (.env) file.
function modify_env_config() {
    # make a backup of the .env file one time and leave it untouched as a record
    # of the original contents
    if [[ ! -f .env.orig && -e .env ]]; then
        cp .env .env.orig
        chown --reference=example.env .env.orig
    fi
    if [[ ! -f .env ]]; then
        # create an empty .env file if it is missing
        touch .env
    fi
    # use awk to add or replace each setting in the .env file
    add_or_replace_var_in_env 'DEFAULT_PROTOCOL' "${DEFAULT_PROTOCOL}"
    add_or_replace_var_in_env 'SVC_BASE_URI' "${SVC_BASE_URI}"

    if [[ "${ADMIN_ENABLED}" == 'yes' ]]; then
        add_or_replace_var_in_env 'ADMIN_ENABLED' 'true'
        add_or_replace_var_in_env 'ADMIN_USERNAME' "${ADMIN_USERNAME}"
        add_or_replace_var_in_env 'ADMIN_PASSWD_FILE' "${ADMIN_PASSWD_FILE}"
    else
        add_or_replace_var_in_env 'ADMIN_ENABLED' ''
        add_or_replace_var_in_env 'ADMIN_USERNAME' ''
        add_or_replace_var_in_env 'ADMIN_PASSWD_FILE' ''
    fi

    # either OIDC is defined or it is completely wiped
    if [[ -n "${OIDC_ISSUER_URI}" ]]; then
        add_or_replace_var_in_env 'OIDC_ISSUER_URI' "${OIDC_ISSUER_URI}"
        add_or_replace_var_in_env 'OIDC_CLIENT_ID' "${OIDC_CLIENT_ID}"
        add_or_replace_var_in_env 'OIDC_CLIENT_SECRET_FILE' "${OIDC_CLIENT_SECRET_FILE}"
    else
        add_or_replace_var_in_env 'OIDC_ISSUER_URI' ''
        add_or_replace_var_in_env 'OIDC_CLIENT_ID' ''
        add_or_replace_var_in_env 'OIDC_CLIENT_SECRET_FILE' ''
    fi
    # always use the OIDC_CLIENT_SECRET_FILE setting over the bare secret
    add_or_replace_var_in_env 'OIDC_CLIENT_SECRET' ''

    # either SAML is defined or it is completely wiped
    if [[ -n "${SAML_IDP_METADATA_URL}" || -n "${SAML_IDP_SSO_URL}" ]]; then
        add_or_replace_var_in_env 'SAML_IDP_METADATA_URL' "${SAML_IDP_METADATA_URL}"
        add_or_replace_var_in_env 'SAML_IDP_SSO_URL' "${SAML_IDP_SSO_URL}"
        add_or_replace_var_in_env 'SAML_SP_ENTITY_ID' "${SAML_SP_ENTITY_ID}"
    elif [[ -n "${SAML_SP_ENTITY_ID}" ]]; then
        # scenario in which user will configure metadata file later
        add_or_replace_var_in_env 'SAML_SP_ENTITY_ID' "${SAML_SP_ENTITY_ID}"
    else
        add_or_replace_var_in_env 'SAML_IDP_METADATA_URL' ''
        add_or_replace_var_in_env 'SAML_IDP_SSO_URL' ''
        add_or_replace_var_in_env 'SAML_SP_ENTITY_ID' ''
    fi

    add_or_replace_var_in_env 'P4PORT' "${P4PORT}"
    add_or_replace_var_in_env 'P4USER' "${P4USER}"
    add_or_replace_var_in_env 'P4PASSWD' "${P4PASSWD}"
    # When running in systemd the service usually does not have a HOME and thus
    # will not generally be able to find the .p4tickets file.
    add_or_replace_var_in_env 'P4TICKETS' "${P4TICKETS:-${HOME}/.p4tickets}"
    if $INJECT_P4TRUST; then
        # When running in systemd the service usually does not have a HOME and
        # thus will not generally be able to find the .p4trust file.
        add_or_replace_var_in_env 'P4TRUST' "${P4TRUST:-${HOME}/.p4trust}"
    fi
    add_or_replace_var_in_env 'BEARER_TOKEN' "${BEARER_TOKEN}"
    # save the encoded version of the bearer token for convenience
    BEARER_BASE64=$(echo -n "$BEARER_TOKEN" | base64)
    add_or_replace_var_in_env 'BEARER_BASE64' "${BEARER_BASE64}"

    # Ensure the logging.config.cjs file is readable by all users to avoid
    # difficult to debug situations where the logging is not working and no
    # errors are displayed.
    chmod 0644 logging.config.cjs
    # always enable logging for the time being
    add_or_replace_var_in_env 'LOGGING' '../logging.config.cjs'
    chown --reference=example.env .env
}

# Normalize the settings and write to the configuration file.
function modify_config() {
    if [[ -z "${DEFAULT_PROTOCOL}" ]]; then
        # set DEFAULT_PROTOCOL based on provided inputs
        if [[ -n "${OIDC_ISSUER_URI}" && -z "${SAML_IDP_SSO_URL}" && -z "${SAML_IDP_METADATA_URL}" ]]; then
            DEFAULT_PROTOCOL='oidc'
        elif [[ -n "${SAML_IDP_SSO_URL}" || -n "${SAML_IDP_METADATA_URL}" ]]; then
            DEFAULT_PROTOCOL='saml'
        fi
    fi
    if [[ -n "${ADMIN_PASSWD}" ]]; then
        # write ADMIN_PASSWD to file named by ADMIN_PASSWD_FILE;
        # make the ADMIN_PASSWD_FILE file readable only by current user
        echo "${ADMIN_PASSWD}" > ${ADMIN_PASSWD_FILE}
        chmod 600 ${ADMIN_PASSWD_FILE}
        chown --reference=example.env ${ADMIN_PASSWD_FILE}
    fi
    if [[ -n "${OIDC_CLIENT_SECRET}" ]]; then
        # write OIDC_CLIENT_SECRET to file named by OIDC_CLIENT_SECRET_FILE;
        # make the OIDC_CLIENT_SECRET_FILE file readable only by current user
        echo "${OIDC_CLIENT_SECRET}" > ${OIDC_CLIENT_SECRET_FILE}
        chmod 600 ${OIDC_CLIENT_SECRET_FILE}
        chown --reference=example.env ${OIDC_CLIENT_SECRET_FILE}
    fi
    if [[ "${CONFIG_FILE_NAME}" == ".env" ]]; then
        modify_env_config
    else
        echo 'WARNING: configuration changes not written to file!'
    fi
    # ensure log file exists and is writable by the owner
    if [[ ! -f auth-svc.log ]]; then
        touch auth-svc.log
        chown --reference=example.env auth-svc.log
    fi
}

# Restart the service for the configuration changes to take effect.
function restart_service() {
    # ignore errors when attempting to stop the service
    set +e
    # Try stopping HAS using systemctl if the service unit is present.
    if [[ -f /etc/systemd/system/helix-auth.service ]]; then
        sudo systemctl stop helix-auth
    fi
    set -e

    # Start the service using the preferred process manager.
    if [[ -f /etc/systemd/system/helix-auth.service ]]; then
        sudo systemctl start helix-auth
        SVC_RESTARTED=true
    fi
    return 0
}

# Print a summary of what was done and any next steps.
function print_summary() {
    cat <<EOT

==============================================================================
Automated configuration complete!

What was done:
  * The ${CONFIG_FILE_NAME} configuration file was updated.
  * Logging has been configured to write to auth-svc.log in this directory.
EOT
    if $SVC_RESTARTED; then
        echo '  * The service was restarted.'
    fi
    echo -e "\nWhat should be done now:"
    if ! $SVC_RESTARTED; then
        echo '  * The service must be restarted for the changes to take effect.'
    fi
    if [[ -n "${SAML_IDP_SSO_URL}" && -z "${SAML_IDP_METADATA_URL}" ]]; then
        echo '  * Be sure to set IDP_CERT_FILE to the path of a file containing the'
        echo '    public certificate of the SAML identity provider. This facilitates'
        echo '    the verification of the SAML response, preventing MITM attacks.'
    fi
    if [[ -n "${BEARER_TOKEN}" ]]; then
        BEARER_BASE64=$(echo -n "$BEARER_TOKEN" | base64)
        echo '  * Provide the BEARER_TOKEN value to the cloud service provider.'
        echo "    The base64-encoded value is ${BEARER_BASE64}"
    fi
    cat <<EOT
  * If not already completed, the server and client certificates should be
    replaced with genuine certificates, replacing the self-signed certs.
    See the Administration Guide for additional information.
  * Visit the service in a browser to verify it is accessible:
        ${SVC_BASE_URI}
EOT
    if [[ "${ADMIN_ENABLED}" == 'yes' ]]; then
        cat <<EOT
  * Visit the administrative web interface in a browser to finish the
    configuration of the service:
        ${SVC_BASE_URI}/admin
EOT
    fi
    cat <<EOT
  * Consult the admin guide for other settings that may need to be changed
    in accordance with the configuration of the identity provider.
  * If using Helix Core server, be sure to install and configure the login
    extension that interoperates with the service to enable SSO authentication.
  * If using Helix ALM, be sure to configure the License Server to connect
    with the authentication service for enforcing access controls.

==============================================================================

EOT
}

function main() {
    # move to the source directory before everything else
    cd "$( cd "$(dirname "$0")" ; pwd -P )/.."
    # include our bin in case node can be found there
    export PATH=$(pwd)/bin:${PATH}
    set -e
    read_arguments "$@"
    ensure_readiness
    source_enviro
    if $INTERACTIVE || $DEBUG; then
        display_arguments
    fi
    if $INTERACTIVE; then
        display_interactive
        read_settings
        prompt_for_inputs
        while ! validate_inputs; do
            prompt_for_inputs
        done
    elif ! validate_inputs; then
        exit 1
    fi
    clean_inputs
    print_preamble
    if $INTERACTIVE; then
        prompt_to_proceed
    fi
    modify_config
    restart_service
    print_summary
}

main "$@"

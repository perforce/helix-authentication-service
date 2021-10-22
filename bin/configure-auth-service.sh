#!/usr/bin/env bash
#
# Configuration script for Helix Authentication Service.
#
# Copyright 2021, Perforce Software Inc. All rights reserved.
#
INTERACTIVE=true
MONOCHROME=false
SVC_RESTARTED=false
DEBUG=false
PLATFORM=''
SVC_BASE_URI=''
declare -A PROTOCOLS=()
DEFAULT_PROTOCOL=''
SAML_IDP_METADATA_URL=''
SAML_IDP_SSO_URL=''
SAML_SP_ENTITY_ID=''
OIDC_ISSUER_URI=''
OIDC_CLIENT_ID=''
OIDC_CLIENT_SECRET=''
OIDC_CLIENT_SECRET_FILE='client-secret.txt'
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
    [[ "$default" =~ [[:space:]]+ ]] && default=''

    while true; do
        local input=''
        if [[ -n "$default" ]]; then
            read -e -p "$prompt [$default]: " input
            if [[ ! -n "$input" ]]; then
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

# Prompt the user for a password by showing a prompt string and not echoing
# input to the terminal. Optionally calls a validation function to check if the
# response is OK.
#
# prompt_for <VAR> <prompt> <default> [<validationfunc>]
function prompt_for_secret() {
    local var="$1"
    local prompt="$2"
    local default="$3"
    local check_func=true

    [[ -n "$4" ]] && check_func=$4
    [[ "$default" =~ [[:space:]]+ ]] && default=''

    while true; do
        local pw=''
        local pw2=''
        if [[ -n "$default" ]]; then
            # conceal the length of the incoming password
            read -s -e -p "$prompt [************]: " pw
            if [[ ! -n "$pw" ]]; then
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

# Print the usage text to STDOUT.
function usage() {
    cat <<EOS

Usage:

    configure-auth-service.sh [-n] [-m] ...

Description:

    Configuration script for Helix Authentication Service.

    This script will modify the ecosystem.config.cjs or .env file according
    to the values provided via arguments or interactive input, and then
    restart the service via pm2 or systemd.

    -m
        Monochrome; no colored text.

    -n
        Non-interactive mode; exits immediately if prompting is required.

    --base-url <base-url>
        HTTP/S address of the authentication service.

    --oidc-issuer-uri <issuer-uri>
        Issuer URI for the OpenID Connect identity provider.

    --oidc-client-id <client-id>
        Client identifier for connecting to OIDC identity provider.

    --oidc-client-secret <client-secret>
        Client secret associated with the OIDC client identifier.

    --saml-idp-metadata-url <metdata-url>
        URL for the SAML identity provider configuration metadata.

    --saml-idp-sso-url <sso-url>
        URL for the SAML identity provider SSO endpoint.

    --saml-sp-entityid <entity-id>
        SAML entity identifier for the authentication service.

    --default-protocol <protocol>
        Set the default protocol to be used when a client application does
        not specify a protocol to be used. This option only applies when
        configuring more than one protocol.

    --pm2
        Configure for the pm2 process manager instead of systemd.

    --debug
        Enable debugging output for this configuration script.

    -h / --help
        Display this help message.

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

# Ensure OS is compatible and dependencies are already installed.
function ensure_readiness() {
    if [[ -e '/etc/redhat-release' ]]; then
        PLATFORM=redhat
    elif [[ -e '/etc/debian_version' ]]; then
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
        die 'Could not determine OS distribution.'
    fi
    # Either there exists the single binary or the requirements for running the
    # application using Node.js must be in place.
    if [[ ! -e helix-auth-svc ]]; then
        if ! which node >/dev/null 2>&1 || ! node --version | grep -Eq '^v14\.'; then
            die 'Node.js v14 is required. Please run install.sh to install dependencies.'
        fi
        if [[ ! -d node_modules ]]; then
            die 'Module dependencies are missing. Please run install.sh before proceeding.'
        fi
    fi
}

# If user elected to configure for pm2, make sure that the system is
# sufficiently ready for doing so.
function ensure_pm2_readiness() {
    if [[ "${CONFIG_FILE_NAME}" == "ecosystem.config.cjs" ]]; then
        if ! which node >/dev/null 2>&1; then
            die 'Node.js is required for pm2. Please run install.sh to install dependencies.'
        fi
    fi
}

function read_arguments() {
    # build up the list of arguments in pieces since there are so many
    local ARGS=(base-url:)
    ARGS+=(oidc-issuer-uri: oidc-client-id: oidc-client-secret:)
    ARGS+=(saml-idp-sso-url: saml-sp-entityid: saml-idp-metadata-url:)
    ARGS+=(default-protocol: pm2 debug help)
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
            --base-url)
                SVC_BASE_URI=$2
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
            --pm2)
                CONFIG_FILE_NAME='ecosystem.config.cjs'
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
OIDC Issuer URI                [${OIDC_ISSUER_URI:-(not specified)}]
OIDC Client ID                 [${OIDC_CLIENT_ID:-(not specified)}]
OIDC Client Secret             [(secret not shown)]
SAML IdP Metadata URL          [${SAML_IDP_METADATA_URL:-(not specified)}]
SAML IdP SSO URL               [${SAML_IDP_SSO_URL:-(not specified)}]
SAML SP Entity ID              [${SAML_SP_ENTITY_ID:-(not specified)}]

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


The URL of the authentication service, which must be visible to end users.
It must match the application settings defined in the IdP configuration.
The URL must begin with either http: or https:, and maybe include a port
number. If the URL contains a port number, then the service will listen for
connections on that port.

Example: https://has.example.com:3000/

EOT
    prompt_for SVC_BASE_URI 'Enter the URL for the authentication service' "${SVC_BASE_URI}" validate_url
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

# Prompt for inputs.
function prompt_for_inputs() {
    prompt_for_svc_base_uri
    prompt_for_protocols
    if [[ -n "${PROTOCOLS['oidc']}" ]]; then
        prompt_for_oidc_issuer_uri
        prompt_for_oidc_client_id
        prompt_for_oidc_client_secret
    fi
    if [[ -n "${PROTOCOLS['saml']}" ]]; then
        prompt_for_saml_idp_metadata_url
        prompt_for_saml_idp_sso_url
        if [[ -n "${SAML_IDP_SSO_URL}" || -n "${SAML_IDP_METADATA_URL}" ]]; then
            prompt_for_saml_sp_entity_id
        fi
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

# Validate all of the inputs however they may have been provided.
function validate_inputs() {
    if ! validate_url "$SVC_BASE_URI"; then
        error 'A valid base URL for the service must be provided.'
        return 1
    fi
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

# Normalize the user inputs.
function clean_inputs() {
    if [[ ! -z "$SVC_BASE_URI" ]]; then
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

# Make the prescribed changes to the ecosystem configuration file.
function modify_eco_config() {
    # make a backup of the ecosystem file one time and leave it untouched as a
    # record of the original contents
    if [[ ! -f ecosystem.config.orig && -e ecosystem.config.cjs ]]; then
        cp ecosystem.config.cjs ecosystem.config.orig
    fi
    # use Node.js to update the configuration file in place since the format is
    # a bit too complex for simple sed/awk scripting to handle
    env DEFAULT_PROTOCOL="${DEFAULT_PROTOCOL}" \
        SVC_BASE_URI="${SVC_BASE_URI}" \
        OIDC_ISSUER_URI="${OIDC_ISSUER_URI}" \
        OIDC_CLIENT_ID="${OIDC_CLIENT_ID}" \
        OIDC_CLIENT_SECRET_FILE="${OIDC_CLIENT_SECRET_FILE}" \
        SAML_IDP_METADATA_URL="${SAML_IDP_METADATA_URL}" \
        SAML_IDP_SSO_URL="${SAML_IDP_SSO_URL}" \
        SAML_SP_ENTITY_ID="${SAML_SP_ENTITY_ID}" \
        node ./bin/writeconf.cjs
}

# Retrieve any existing service settings to prime the inputs.
function read_settings() {
    if [[ ! -f .env ]]; then
        return
    fi
    # awk has a hard time doing the simple things that grep and cut can do, so
    # must invoke multiple commands through pipes like a novice.
    PROTO=$(grep '^DEFAULT_PROTOCOL=' .env | cut -d= -f2-)
    if [[ -n "${PROTO}" ]]; then
        PROTO=$(sed -e "s/^'//" -e "s/'$//" -e 's/^"//' -e 's/"$//' <<<"$PROTO")
        DEFAULT_PROTOCOL="${DEFAULT_PROTOCOL:-${PROTO}}"
    fi
    SBURI=$(grep '^SVC_BASE_URI=' .env | cut -d= -f2-)
    if [[ -n "${SBURI}" ]]; then
        SBURI=$(sed -e "s/^'//" -e "s/'$//" -e 's/^"//' -e 's/"$//' <<<"$SBURI")
        SVC_BASE_URI="${SVC_BASE_URI:-${SBURI}}"
    fi
    OIU=$(grep '^OIDC_ISSUER_URI=' .env | cut -d= -f2-)
    if [[ -n "${OIU}" ]]; then
        OIU=$(sed -e "s/^'//" -e "s/'$//" -e 's/^"//' -e 's/"$//' <<<"$OIU")
        OIDC_ISSUER_URI="${OIDC_ISSUER_URI:-${OIU}}"
    fi
    OCI=$(grep '^OIDC_CLIENT_ID=' .env | cut -d= -f2-)
    if [[ -n "${OCI}" ]]; then
        OCI=$(sed -e "s/^'//" -e "s/'$//" -e 's/^"//' -e 's/"$//' <<<"$OCI")
        OIDC_CLIENT_ID="${OIDC_CLIENT_ID:-${OCI}}"
    fi
    OCSF=$(grep '^OIDC_CLIENT_SECRET_FILE=' .env | cut -d= -f2-)
    if [[ -n "${OCSF}" ]]; then
        OCSF=$(sed -e "s/^'//" -e "s/'$//" -e 's/^"//' -e 's/"$//' <<<"$OCSF")
        OIDC_CLIENT_SECRET_FILE="${OIDC_CLIENT_SECRET_FILE:-${OCSF}}"
        if [ -f "${OIDC_CLIENT_SECRET_FILE}" ]; then
            OIDC_CLIENT_SECRET=$(<${OIDC_CLIENT_SECRET_FILE})
        fi
    fi
    OCS=$(grep '^OIDC_CLIENT_SECRET=' .env | cut -d= -f2-)
    if [[ -n "${OCS}" ]]; then
        OCS=$(sed -e "s/^'//" -e "s/'$//" -e 's/^"//' -e 's/"$//' <<<"$OCS")
        OIDC_CLIENT_SECRET="${OIDC_CLIENT_SECRET:-${OCS}}"
    fi
    SIMU=$(grep '^SAML_IDP_METADATA_URL=' .env | cut -d= -f2-)
    if [[ -n "${SIMU}" ]]; then
        SIMU=$(sed -e "s/^'//" -e "s/'$//" -e 's/^"//' -e 's/"$//' <<<"$SIMU")
        SAML_IDP_METADATA_URL="${SAML_IDP_METADATA_URL:-${SIMU}}"
    fi
    SISU=$(grep '^SAML_IDP_SSO_URL=' .env | cut -d= -f2-)
    if [[ -n "${SISU}" ]]; then
        SISU=$(sed -e "s/^'//" -e "s/'$//" -e 's/^"//' -e 's/"$//' <<<"$SISU")
        SAML_IDP_SSO_URL="${SAML_IDP_SSO_URL:-${SISU}}"
    fi
    SSEI=$(grep '^SAML_SP_ENTITY_ID=' .env | cut -d= -f2-)
    if [[ -n "${SSEI}" ]]; then
        SSEI=$(sed -e "s/^'//" -e "s/'$//" -e 's/^"//' -e 's/"$//' <<<"$SSEI")
        SAML_SP_ENTITY_ID="${SAML_SP_ENTITY_ID:-${SSEI}}"
    fi
    LOG=$(grep '^LOGGING=' .env | cut -d= -f2-)
    if [[ -n "${LOG}" ]]; then
        LOG=$(sed -e "s/^'//" -e "s/'$//" -e 's/^"//' -e 's/"$//' <<<"$LOG")
        LOGGING="${LOGGING:-${LOG}}"
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
    fi
    if [[ ! -f .env ]]; then
        # create an empty .env file if it is missing
        touch .env
    fi
    # use awk to add or replace each setting in the .env file
    add_or_replace_var_in_env 'DEFAULT_PROTOCOL' "${DEFAULT_PROTOCOL}"
    add_or_replace_var_in_env 'SVC_BASE_URI' "${SVC_BASE_URI}"

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
    else
        add_or_replace_var_in_env 'SAML_IDP_METADATA_URL' ''
        add_or_replace_var_in_env 'SAML_IDP_SSO_URL' ''
        add_or_replace_var_in_env 'SAML_SP_ENTITY_ID' ''
    fi

    # Ensure the logging.config.js file is readable by all users to avoid
    # difficult to debug situations where the logging is not working and no
    # errors are displayed.
    chmod 0644 logging.config.js
    # always enable logging for the time being
    if [[ -f 'bin/www.js' ]]; then
        # As a plain Node.js application, the logging require path is relative
        # to the bin/www.js script.
        add_or_replace_var_in_env 'LOGGING' '../logging.config.js'
    else
        # As a single binary, a full path is required since any relative path
        # would be treated as internal to the binary archive.
        add_or_replace_var_in_env 'LOGGING' "$(pwd)/logging.config.js"
    fi
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
    if [[ -n "${OIDC_CLIENT_SECRET}" ]]; then
        # write OIDC_CLIENT_SECRET to file named by OIDC_CLIENT_SECRET_FILE;
        # make the OIDC_CLIENT_SECRET_FILE file readable only by current user
        echo "${OIDC_CLIENT_SECRET}" > ${OIDC_CLIENT_SECRET_FILE}
        chmod 600 ${OIDC_CLIENT_SECRET_FILE}
        chown ${SUDO_USER:-${USER}} ${OIDC_CLIENT_SECRET_FILE}
    fi
    if [[ "${CONFIG_FILE_NAME}" == ".env" ]]; then
        modify_env_config
    elif [[ "${CONFIG_FILE_NAME}" == "ecosystem.config.cjs" ]]; then
        modify_eco_config
    else
        echo 'WARNING: configuration changes not written to file!'
    fi
    # ensure log file exists and is writable by the sudo user
    if [[ ! -f auth-svc.log ]]; then
        touch auth-svc.log
        chown ${SUDO_USER:-${USER}} auth-svc.log
    fi
}

# Restart the service for the configuration changes to take effect.
function restart_service() {
    # ignore errors when attempting to stop the service
    set +e
    # Stop the existing service, if it is running.
    if [[ -f ecosystem.config.cjs ]] && which pm2 >/dev/null 2>&1; then
        # If pm2 is present then presumably HAS is managed using it, in which
        # case we use the pm2 commands to stop and delete the old application
        # before starting again (possibly via systemctl). This likely also helps
        # reload the settings properly without having kill the pm2 daemon.
        PM2_USER=${SUDO_USER:-${USER}}
        sudo -u $PM2_USER pm2 delete ecosystem.config.cjs
        sudo -u $PM2_USER pm2 save
    fi
    # Just in case pm2 was installed but not being used to manage the HAS
    # process, also try stopping HAS using systemctl if the service unit is
    # present.
    if [[ -f /etc/systemd/system/helix-auth.service ]]; then
        sudo systemctl stop helix-auth
    fi
    set -e

    # Start the service using the preferred process manager.
    if [[ "${CONFIG_FILE_NAME}" == "ecosystem.config.cjs" ]]; then
        PM2_USER=${SUDO_USER:-${USER}}
        sudo -u $PM2_USER pm2 start ecosystem.config.cjs
        SVC_RESTARTED=true
    elif [[ -f /etc/systemd/system/helix-auth.service ]]; then
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
    cat <<EOT
  * If not already completed, the server and client certificates should be
    replaced with genuine certificates, replacing the self-signed certs.
    See the Administration Guide for additional information.
  * Visit the authentication service in a browser to verify it is accessible:
    ${SVC_BASE_URI}
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
    ensure_readiness
    set -e
    read_arguments "$@"
    ensure_pm2_readiness
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

# -*- coding: utf-8 -*-
"""Fabric file for configuring authentication service for testing.

Note that getting SELinux enabled on Ubuntu is probably impossible.
To test with SELinux, use CentOS 7 where SELinux is enabled by default.

"""

import os
from socket import AF_INET, inet_pton
from struct import unpack
import subprocess

from fabric.api import abort, cd, env, execute, prefix, put, run, settings, shell_env, sudo, task
from fabric.contrib.files import append, exists

env.use_ssh_config = True
env.ssh_config_path = "ssh_config"

# Generate the ssh_config file if it is missing.
if not os.path.exists('ssh_config'):
    config = subprocess.check_output(['vagrant', 'ssh-config'], universal_newlines=True)
    pwd = os.getcwd() + '/'
    with open('ssh_config', 'w') as fobj:
        fobj.write(config.replace(pwd, ''))

# Use the 2019.1 release of p4d rather than cutting edge main.
P4_PUB_KEY = "http://pkg-ondemand.bnr.perforce.com/perforce/r19.1/perforce.pubkey"
P4_APT_URL = "http://pkg-ondemand.bnr.perforce.com/perforce/r19.1/apt/ubuntu"
SUPER_PASSWD = 'Rebar123'


@task
def prepare():
    """Prepare systems for use in testing."""
    # generate the default locale to avoid errors
    sudo('locale-gen en_US.UTF-8')
    sudo('apt-get update -q -y')
    with shell_env(DEBIAN_FRONTEND='noninteractive'):
        sudo('apt-get upgrade -q -y')
    sudo('apt-get clean -q -y')
    sudo('apt-get autoremove -q -y')
    sudo('apt-get install -q -y emacs-nox')
    # amazingly, ubuntu does not ship with unzip pre-installed
    sudo('apt-get install -q -y unzip')
    if exists('/var/run/reboot-required'):
        sudo('shutdown -h now')


@task
def install_nodejs():
    """Install Node.js via the standard shell script."""
    if run('which node', quiet=True).return_code == 0:
        return
    # install build tools for compiling native modules, if needed
    sudo('apt-get install -q -y build-essential')
    # minimal systems often lack things any sane person would expect
    sudo('apt-get install -q -y curl')
    # The node package on ubuntu is stupidly old, so run a shell script from the
    # internet as root to get the LTS version directly from the vendor. This
    # includes npm as well.
    #
    # c.f. https://nodejs.org/en/download/package-manager/
    run('curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -')
    sudo('apt-get install -q -y nodejs')
    # run npm once as the unprivileged user so it creates the ~/.config
    # directory with the unprivileged user as the owner, rather than as root
    # when we run the very first 'npm install' command later
    run('npm version')


@task
def install_pm2():
    """Install pm2 using npm."""
    if run('which pm2', quiet=True).return_code == 0:
        return
    execute(install_nodejs)
    sudo('npm install -q -g pm2')


@task
def provision_service():
    """Install and configure the authentication service from source."""
    execute(install_pm2)
    # npm command needs git
    sudo('apt-get install -q -y git')
    run('wget -q https://swarm.perforce.com/archives/depot/main/p4-auth-integ-svc.zip')
    run('unzip -q p4-auth-integ-svc.zip')
    run('rm p4-auth-integ-svc.zip')
    ip_addr = get_public_ip()
    ecosystem = """
// auth-svc configuration for pm2
module.exports = {{
  apps: [{{
    name: 'auth-svc',
    script: './bin/www',
    env: {{
      NODE_ENV: 'development',
      OIDC_CLIENT_ID: 'client_id',
      OIDC_CLIENT_SECRET: 'client_secret',
      OIDC_ISSUER_URI: 'http://localhost:3001/',
      SVC_BASE_URI: 'https://{ipaddr}:3000',
      DEFAULT_PROTOCOL: 'oidc',
      CA_CERT_FILE: 'certs/sp.crt',
      IDP_CERT_FILE: 'certs/sp.crt',
      IDP_KEY_FILE: 'certs/sp.key',
      SAML_IDP_SSO_URL: 'http://localhost:7000/saml/sso',
      SAML_IDP_SLO_URL: 'http://localhost:7000/saml/slo',
      SAML_SP_ISSUER: 'urn:example:sp',
      SP_CERT_FILE: 'certs/sp.crt',
      SP_KEY_FILE: 'certs/sp.key'
    }}
  }}]
}}
""".format(ipaddr=ip_addr)
    with cd('p4-auth-integ-svc'):
        run('npm ci -q')
        with open('ecosystem.tmp', 'w') as fobj:
            fobj.write(ecosystem)
        put('ecosystem.tmp', 'ecosystem.config.js')
        os.unlink('ecosystem.tmp')
        run('pm2 start ecosystem.config.js')
    username = run('whoami')
    sudo('pm2 startup systemd -u {0} --hp /home/{0}'.format(username))
    run('pm2 save')


@task
def update_service():
    """Update a running authentication service installation."""
    run('pm2 stop auth-svc')
    run('rm -rf p4-auth-integ-svc.old')
    run('mv p4-auth-integ-svc p4-auth-integ-svc.old')
    run('wget -q https://swarm.perforce.com/archives/depot/main/p4-auth-integ-svc.zip')
    run('unzip -q p4-auth-integ-svc.zip')
    run('rm p4-auth-integ-svc.zip')
    run('cp p4-auth-integ-svc.old/ecosystem.config.js p4-auth-integ-svc')
    with cd('p4-auth-integ-svc'):
        run('npm ci -q')
        run('pm2 start ecosystem.config.js')


def configure_apt_get():
    """Configure apt-get so we can install Perforce packages."""
    SOURCES_LIST = '/etc/apt/sources.list.d/perforce.sources.list'
    if not exists(SOURCES_LIST):
        run('wget -q {}'.format(P4_PUB_KEY))
        sudo('apt-key add perforce.pubkey')
        run('rm -f perforce.pubkey')
        codename = run('lsb_release -sc')
        apt_repo = 'deb {} {} release'.format(P4_APT_URL, codename)
        append(SOURCES_LIST, apt_repo, use_sudo=True)
    sudo('apt-get -q -y update')


@task
def provision_p4d():
    """Install and configure the Helix Server with extensions and test setup."""
    execute(install_p4d)
    execute(configure_p4d)
    execute(install_extension)


@task
def install_p4d():
    """Install and configure the Helix server."""
    execute(configure_apt_get)
    sudo('apt-get install -q -y helix-cli')
    sudo('apt-get install -q -y helix-p4d')
    ip_addr = get_public_ip()
    p4port = '{host}:1666'.format(host=ip_addr)
    cmd_args_fmt = '-n -p {port} -u {user} -P {passwd} despot'
    cmd_args = cmd_args_fmt.format(port=p4port, user='super', passwd=SUPER_PASSWD)
    sudo('/opt/perforce/sbin/configure-helix-p4d.sh ' + cmd_args)


@task
def install_extension():
    """Install and configure the extensions to perform login/logout."""
    with cd('p4-auth-integ-svc'):
        ip_addr = get_public_ip()
        with shell_env(P4PORT='{}:1666'.format(ip_addr), AUTH_URL='https://{}:3000'.format(ip_addr)):
            run('node hook.js')


@task
def configure_p4d():
    """Configure Helix Server users and groups for testing."""
    ip_addr = get_public_ip()
    p4port = '{host}:1666'.format(host=ip_addr)
    #
    # create a group with long lived tickets;
    # login as super again to get the unlimited ticket effect
    #
    with open('group.txt', 'w') as fobj:
        fobj.write('Group:\tnotimeout\n')
        fobj.write('Timeout:\tunlimited\n')
        fobj.write('Users:\n')
        fobj.write('\tsuper\n')
    put('group.txt')
    run('p4 -p {0} -u super group -i < group.txt'.format(p4port))
    run('rm -f group.txt')
    os.unlink('group.txt')
    run('p4 -p {0} -u super logout'.format(p4port))
    run('echo {0} | p4 -p {1} -u super login'.format(SUPER_PASSWD, p4port))
    run('p4 -p {0} -u super configure set auth.sso.allow.passwd=1'.format(p4port))
    #
    # restart p4d so the changes take effect
    #
    with settings(sudo_user='perforce'):
        sudo('p4dctl stop despot')
        sudo('p4dctl start despot')


def get_public_ip():
    """Discover the public IP address of the remote host."""
    ip_addrs = run('hostname -I').split()
    for ip in ip_addrs:
        if not is_private_ip(ip):
            return ip
    # fall back to using the first address
    return ip_addrs[0]


def is_private_ip(ip):
    """Return True if the given IP address is private, False otherwise."""
    f = unpack('!I', inet_pton(AF_INET, ip))[0]
    private = (
        [2130706432, 4278190080], # 127.0.0.0,   255.0.0.0   http://tools.ietf.org/html/rfc3330
        [3232235520, 4294901760], # 192.168.0.0, 255.255.0.0 http://tools.ietf.org/html/rfc1918
        [2886729728, 4293918720], # 172.16.0.0,  255.240.0.0 http://tools.ietf.org/html/rfc1918
        [167772160,  4278190080], # 10.0.0.0,    255.0.0.0   http://tools.ietf.org/html/rfc1918
    )
    for net in private:
        if (f & net[1]) == net[0]:
            return True
    return False

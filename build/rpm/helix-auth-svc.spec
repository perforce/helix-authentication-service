%define p4release %(echo -n $ID_REL_BASE)
%define p4change %(echo -n $ID_PATCH)
%define hasversion %(echo -n "HAS/noarch/${ID_REL_BASE}/${ID_PATCH}")
%define installprefix /opt/perforce/helix-auth-svc

Name:           helix-auth-svc
Version:        %{p4release}
Release:        %{p4change}
Summary:        Helix Authentication Service
License:        BSD
URL:            http://www.perforce.com/
Source0:        helix-auth-svc.tar.gz

%description
Authentication protocol (OIDC, SAML) integration service.

# empty files that rpm creates and then complains about
%global debug_package %{nil}
# Prevent the strip command from attempting to strip the debug info from the
# pkg-built binary since that causes it to fail on startup.
%global __os_install_post %{nil}

%prep
%setup -q
# no setup

%build
# no build

%install
install -d %{buildroot}%{installprefix}/bin
install -d %{buildroot}%{installprefix}/certs
install -d %{buildroot}%{installprefix}/docs

install -m 0755 helix-auth-svc %{buildroot}%{installprefix}/helix-auth-svc
install -m 0755 bin/configure-auth-service.sh %{buildroot}%{installprefix}/bin/configure-auth-service.sh
cp -p bin/writeconf.js %{buildroot}%{installprefix}/bin/writeconf.js
cp -pr certs/* %{buildroot}%{installprefix}/certs
cp -p docs/Administrator-Guide.md %{buildroot}%{installprefix}/docs/Administrator-Guide.md
cp -p docs/Cookies.md %{buildroot}%{installprefix}/docs/Cookies.md
cp -p docs/Failover.md %{buildroot}%{installprefix}/docs/Failover.md
cp -p docs/Proxies.md %{buildroot}%{installprefix}/docs/Proxies.md
cp -p docs/REST_API.md %{buildroot}%{installprefix}/docs/REST_API.md
cp -pr docs/licenses %{buildroot}%{installprefix}/docs/licenses

cp example.env %{buildroot}%{installprefix}/example.env
cp logging.config.js %{buildroot}%{installprefix}/logging.config.js
sed -e "s/\"2021.1.0\"/\"${ID_REL_BASE}-${ID_PATCH}\"/" \
    -e "s|+MAIN+|%{hasversion}|" \
    package.json > %{buildroot}%{installprefix}/package.json
cp README.md %{buildroot}%{installprefix}/README.md
cp README.html %{buildroot}%{installprefix}/README.html
cp RELNOTES.txt %{buildroot}%{installprefix}/RELNOTES.txt

%files
%docdir %{installprefix}/docs
%config(noreplace) %{installprefix}/logging.config.js
%{installprefix}

%post
if [ ! -f "%{installprefix}/.env" ]; then
    cp %{installprefix}/example.env %{installprefix}/.env
fi

# If this fails, it means either systemd is not installed or it does not have
# privileged access (to the container), in which case we will skip setting up
# the service unit.
HAS_SYSTEMD=true
if ! systemctl list-units >/dev/null 2>&1; then
    HAS_SYSTEMD=false
fi

if $HAS_SYSTEMD; then
    cat >/etc/systemd/system/helix-auth.service <<__SERVICE_UNIT__
[Unit]
Description=Helix Authentication Service
After=network.target

[Service]
Type=simple
Restart=always
ExecStart=%{installprefix}/helix-auth-svc
WorkingDirectory=%{installprefix}

[Install]
WantedBy=multi-user.target
__SERVICE_UNIT__

    systemctl daemon-reload
    systemctl enable helix-auth.service
    systemctl start helix-auth.service

cat <<EOF

===============================================================================
Package installation complete!
===============================================================================

The Helix Authentication Service is now running via systemd using the service
name 'helix-auth'. Use the command 'sudo systemctl status helix-auth' to get
the status of the service.

To configure the service, edit the .env file in the directory shown below, and
then restart the service: sudo systemctl restart helix-auth

    %{installprefix}

In particular, the settings to be changed are the OIDC and/or SAML settings
for your identity provider. The configure-auth-service.sh script may be
helpful for this purpose.

    %{installprefix}/bin/configure-auth-service.sh --help

For assistance, please contact support@perforce.com

EOF
else
    # systemd service unit _not_ installed
cat <<EOF

===============================================================================
Package installation complete!
===============================================================================

The Helix Authentication Service is now installed. To configure the service,
edit the .env file in the directory shown below, and then start the service
by invoking %{installprefix}/helix-auth-svc

    %{installprefix}

In particular, the settings to be changed are the OIDC and/or SAML settings
for your identity provider. The configure-auth-service.sh script may be
helpful for this purpose.

    %{installprefix}/bin/configure-auth-service.sh --help

For assistance, please contact support@perforce.com

EOF
fi

%preun
if [ -f /etc/systemd/system/helix-auth.service ]; then
    systemctl stop helix-auth.service
    rm -f /etc/systemd/system/helix-auth.service
    systemctl daemon-reload
fi

%changelog

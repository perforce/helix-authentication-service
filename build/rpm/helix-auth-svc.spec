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
cp -p docs/REST_API.md %{buildroot}%{installprefix}/docs/REST_API.md
cp -pr docs/licenses %{buildroot}%{installprefix}/docs/licenses

cp logging.config.js %{buildroot}%{installprefix}/logging.config.js

# keep the package.json for the version information
sed -e "s/\"2020.1.1\"/\"${ID_REL_BASE}-${ID_PATCH}\"/" \
    -e "s|+MAIN+|%{hasversion}|" \
    package.json > %{buildroot}%{installprefix}/package.json
cp README.md %{buildroot}%{installprefix}/README.md
cp README.html %{buildroot}%{installprefix}/README.html
cp RELNOTES.txt %{buildroot}%{installprefix}/RELNOTES.txt

%files
%docdir %{installprefix}/docs
%{installprefix}

%doc

%post
if [ ! -f "%{installprefix}/.env" ]; then
    echo 'DEBUG=1' > %{installprefix}/.env
fi
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
Package installation complete! Now a few final bits to do manually.
===============================================================================

To configure the service on this machine, edit the .env file in the directory
shown below, and then restart the service: sudo systemctl restart helix-auth

    %{installprefix}

In particular, the settings to be changed are the OIDC and/or SAML settings
for your identity provider. The configure-auth-service.sh script may be
helpful for this purpose.

    %{installprefix}/bin/configure-auth-service.sh --help

For assistance, please contact support@perforce.com

EOF

%preun
systemctl stop helix-auth.service
rm -f /etc/systemd/system/helix-auth.service
systemctl daemon-reload

%changelog

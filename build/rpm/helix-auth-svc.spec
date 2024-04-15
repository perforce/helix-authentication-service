%define p4release %(echo -n $ID_REL_BASE)
%define p4change %(echo -n $ID_PATCH)
%define hasversion %(echo -n "HAS/noarch/${ID_REL_BASE}/${ID_PATCH}")
%define installprefix /opt/perforce/helix-auth-svc
# CentOS 8 cleverly tries to include what we already have.
%define __requires_exclude /usr/bin/node

Name:           helix-auth-svc
Version:        %{p4release}
Release:        %{p4change}
Summary:        Helix Authentication Service
License:        MIT
URL:            http://www.perforce.com/
Source0:        helix-auth-svc.tar.gz
PreReq:         shadow-utils

%description
Authentication integration and user provisioning service.

# empty files that rpm creates and then complains about
%global debug_package %{nil}

%prep
%setup -q
# no setup

%build
# no build

%install
install -d %{buildroot}%{installprefix}/bin
install -d %{buildroot}%{installprefix}/certs
install -d %{buildroot}%{installprefix}/docs
install -d %{buildroot}%{installprefix}/lib
install -d %{buildroot}%{installprefix}/node_modules
install -d %{buildroot}%{installprefix}/private
install -d %{buildroot}%{installprefix}/public
install -d %{buildroot}%{installprefix}/routes
install -d %{buildroot}%{installprefix}/views

cp -p bin/configure-auth-service.js %{buildroot}%{installprefix}/bin/configure-auth-service.js
install -m 0755 bin/configure-auth-service.sh %{buildroot}%{installprefix}/bin/configure-auth-service.sh
install -m 0755 bin/node %{buildroot}%{installprefix}/bin/node
install -m 0755 bin/www.js %{buildroot}%{installprefix}/bin/www.js
cp -pr certs/* %{buildroot}%{installprefix}/certs
cp -p docs/Administrator-Guide.md %{buildroot}%{installprefix}/docs/Administrator-Guide.md
cp -p docs/Certificates.md %{buildroot}%{installprefix}/docs/Certificates.md
cp -p docs/Cookies.md %{buildroot}%{installprefix}/docs/Cookies.md
cp -p docs/Failover.md %{buildroot}%{installprefix}/docs/Failover.md
cp -p docs/Proxies.md %{buildroot}%{installprefix}/docs/Proxies.md
cp -p docs/REST_API.md %{buildroot}%{installprefix}/docs/REST_API.md
cp -pr docs/licenses %{buildroot}%{installprefix}/docs/licenses
cp -pr lib/* %{buildroot}%{installprefix}/lib
# remove this problematic, seemingly duplicate, file
rm -f node_modules/unix-dgram/build/Release/obj.target/unix_dgram.node
cp -pr node_modules/* %{buildroot}%{installprefix}/node_modules
cp -pr private/* %{buildroot}%{installprefix}/private
cp -pr public/* %{buildroot}%{installprefix}/public
cp -pr routes/* %{buildroot}%{installprefix}/routes
cp -pr views/* %{buildroot}%{installprefix}/views

cp defaults.env %{buildroot}%{installprefix}/defaults.env
cp example.env %{buildroot}%{installprefix}/example.env
cp example.toml %{buildroot}%{installprefix}/example.toml
cp logging.config.cjs %{buildroot}%{installprefix}/logging.config.cjs
cp sentinel.config.cjs %{buildroot}%{installprefix}/sentinel.config.cjs
cp package-lock.json %{buildroot}%{installprefix}/package-lock.json
sed -e "s/\"2024.1.0\"/\"${ID_REL_BASE}-${ID_PATCH}\"/" \
    -e "s|+MAIN+|%{hasversion}|" \
    package.json > %{buildroot}%{installprefix}/package.json
cp LICENSE.txt %{buildroot}%{installprefix}/LICENSE.txt
cp README.md %{buildroot}%{installprefix}/README.md
cp README.html %{buildroot}%{installprefix}/README.html
cp RELNOTES.txt %{buildroot}%{installprefix}/RELNOTES.txt

%files
%license %{installprefix}/LICENSE.txt
%docdir %{installprefix}/docs
%config(noreplace) %{installprefix}/logging.config.cjs
%config(noreplace) %{installprefix}/sentinel.config.cjs
%config(noreplace) %{installprefix}/routes/saml_idp.conf.cjs
%{installprefix}

%post
HOMEDIR=/opt/perforce

# create perforce group as needed
if ! getent group perforce >/dev/null; then
    groupadd --system perforce
fi

# create perforce user as needed
if ! getent passwd perforce >/dev/null; then
    useradd --system --comment 'Perforce Admin' --shell /bin/bash \
            --gid perforce --home-dir "$HOMEDIR" perforce
fi

# create home directory and set ownership as needed
if [ ! -d "$HOMEDIR" ]; then
    mkdir -p "$HOMEDIR"
    chown -R perforce:perforce "$HOMEDIR"
fi

if [ ! -f "%{installprefix}/.env" ] && [ ! -f "%{installprefix}/config.toml" ]; then
    PRINT="print \"LOGGING=%{installprefix}/logging.config.cjs\""
    # inject LOGGING if not already set; strip comments and blank lines
    awk "BEGIN {flg=0} /^$/{next} /^#/{next} /^LOGGING=/{flg=1; ${PRINT}; next} {print} END {if(flg==0) ${PRINT}}" %{installprefix}/example.env > %{installprefix}/.env
    # set the user and group for setuid/setgid
    echo 'SVC_USER=perforce' >> %{installprefix}/.env
    echo 'SVC_GROUP=perforce' >> %{installprefix}/.env
fi

# ensure perforce user can write to the installation path
chown -R perforce:perforce "%{installprefix}"

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
ExecStart=%{installprefix}/bin/node %{installprefix}/bin/www.js
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
for your identity provider. The configure-auth-service.js script may be
helpful for this purpose.

    node %{installprefix}/bin/configure-auth-service.js --help

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
by invoking './bin/node ./bin/www.js' from the directory shown below.

    %{installprefix}

In particular, the settings to be changed are the OIDC and/or SAML settings
for your identity provider. The configure-auth-service.js script may be
helpful for this purpose.

    node %{installprefix}/bin/configure-auth-service.js --help

For assistance, please contact support@perforce.com

EOF
fi

%postun
# RPM is interesting in that it installs the new version of the package over any
# existing version, then removes the old version. As such, the preun and postun
# hooks must account for this and very carefully remove files that were added
# during the installation.
if [ ! -f %{installprefix}/bin/www.js ]; then
    if [ -f /etc/systemd/system/helix-auth.service ]; then
        systemctl stop helix-auth.service
        rm -f /etc/systemd/system/helix-auth.service
        systemctl daemon-reload
    fi
fi

%changelog

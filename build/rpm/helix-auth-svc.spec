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

# Leaving the epoch off results in centos installing an older version of nodejs,
# and for whatever reason, having the epoch forces yum to work correctly.
Requires:       nodejs >= 2:12.16

%description
Authentication protocol (OIDC, SAML) integration service.

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
install -d %{buildroot}%{installprefix}/public
install -d %{buildroot}%{installprefix}/routes
install -d %{buildroot}%{installprefix}/views

install -m 0755 bin/configure-auth-service.sh %{buildroot}%{installprefix}/bin/configure-auth-service.sh
cp -p bin/copyLicenses.js %{buildroot}%{installprefix}/bin/copyLicenses.js
cp -p bin/writeconf.js %{buildroot}%{installprefix}/bin/writeconf.js
install -m 0755 bin/www %{buildroot}%{installprefix}/bin/www
cp -pr certs/* %{buildroot}%{installprefix}/certs
cp -pr docs/* %{buildroot}%{installprefix}/docs
cp -pr lib/* %{buildroot}%{installprefix}/lib
# remove this problematic, seemingly duplicate, file
rm -f node_modules/unix-dgram/build/Release/obj.target/unix_dgram.node
cp -pr node_modules/* %{buildroot}%{installprefix}/node_modules
cp -pr public/* %{buildroot}%{installprefix}/public
cp -pr routes/* %{buildroot}%{installprefix}/routes
cp -pr views/* %{buildroot}%{installprefix}/views

cp ecosystem.config.js %{buildroot}%{installprefix}/ecosystem.config.js
cp logging.config.js %{buildroot}%{installprefix}/logging.config.js
cp package-lock.json %{buildroot}%{installprefix}/package-lock.json
sed -e "s/\"2020.1.0\"/\"${ID_REL_BASE}.${ID_PATCH}\"/" \
    -e "s|+MAIN+|%{hasversion}|" \
    package.json > %{buildroot}%{installprefix}/package.json
cp README.md %{buildroot}%{installprefix}/README.md
cp README.html %{buildroot}%{installprefix}/README.html

%files
%docdir %{installprefix}/docs
%{installprefix}

%doc

%post
# install pm2 globally
if ! which pm2 >/dev/null 2>&1; then
    echo "Installing pm2 globally..."
    sudo npm install -q -g pm2
fi

# start the service using pm2
echo "Starting the auth service with default configuration..."
cd %{installprefix}
pm2 start ecosystem.config.js
# install pm2 startup script
echo "Installing pm2 startup script..."
STARTUP=$(pm2 startup | awk '/\[PM2\] Init System found:/ { print $5 }')
sudo pm2 startup ${STARTUP} -u ${USER} --hp ${HOME}
pm2 save

cat <<!

===============================================================================
Package installation complete! Now a few final bits to do manually.
===============================================================================

To configure the service on this machine, edit the ecosystem.config.js file in
the %{installprefix} directory.
In particular, set the OIDC and/or SAML settings for your identity provider.
The configure-auth-service.sh script may be helpful for this purpose.

$ %{installprefix}/bin/configure-auth-service.sh --help

Note that the pm2 daemon is running as the root user.

For assistance, please contact support@perforce.com

!

%preun
# unregister the service with pm2
if which pm2 >/dev/null 2>&1; then
    if [ -e %{installprefix}/ecosystem.config.js ]; then
        echo "Removing pm2 service registration..."
        pm2 delete %{installprefix}/ecosystem.config.js
        pm2 save --force
        echo "pm2 service registration removed"
    fi
fi

%changelog

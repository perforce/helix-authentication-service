FROM soluto/oidc-server-mock:0.3.2

#
# How to generate a new PFX file:
#
# (generate the self-signed PEM encoded public/private key pair)
#
# $ openssl req -sha256 -nodes -days 3650 -x509 -newkey rsa:4096 -keyout oidc.key -out oidc.cer -subj "/CN=oidc.doc"
#
# (copy the .cer and .key files to a Windows machine)
#
# > certutil -mergepfx oidc.cer aspnetapp.pfx
#
# (enter "oidc-server-mock-pwd" when prompted for the password)
#
# (copy aspnetapp.pfx from Windows machine to here)
#
COPY https/aspnetapp.pfx /https/aspnetapp.pfx

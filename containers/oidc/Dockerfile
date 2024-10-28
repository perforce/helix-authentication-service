FROM soluto/oidc-server-mock:0.3.2

#
# How to generate a new PFX file:
#
# (generate the PEM encoded public/private key pair)
#
# $ openssl req -sha256 -nodes -days 3650 -newkey rsa:4096 -keyout oidc.key -out oidc.csr -subj "/CN=oidc.doc"
# $ openssl x509 -sha256 -req -in oidc.csr -CA ca.crt -CAkey ca.key -out oidc.cer -set_serial 01 -days 3650
#
# (copy the .cer and .key files to a Windows machine)
#
# > certutil -mergepfx oidc.cer aspnetapp.pfx
#
# (enter "oidc-server-mock-pwd" when prompted for the password)
#
# (copy aspnetapp.pfx from Windomws machine to here)
#
COPY https/aspnetapp.pfx /https/aspnetapp.pfx

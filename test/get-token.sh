#!/bin/bash
#
# Script for testing the JSON web token functionality. Set the P4LOGINSSO
# environment variable to '$(pwd)/test/get-token.sh' to get a token
# suitable for authenicating as the p4 user named
# fa2067ca-9797-4c3a-95b8-c6c2e87f615a.
#
curl --silent --request POST --data '{"oid":"fa2067ca-9797-4c3a-95b8-c6c2e87f615a","sub":"fa2067ca-9797-4c3a-95b8-c6c2e87f615a","tid":"719d88f3-f957-44cf-9aa5-0a1a3a44f7b9","aud":"api://25b17cdb-4c8d-434c-9a21-86d67ac501d1"}' http://jwt.doc:3000/token

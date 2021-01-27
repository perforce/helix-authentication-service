#!/bin/bash
#
# Create the has_license.txt file.
#
cat LICENSE.txt > has_license.txt
rm -rf docs/licenses
node bin/copyLicenses.js
for L in `find docs/licenses -type f | sort`; do
    echo -e '\n======================================================================\n' >> has_license.txt
    echo -e "$(echo ${L}| cut -d '/' -f 3)\n" >> has_license.txt
    cat $L >> has_license.txt
done

echo -e '\n======================================================================\n' >> has_license.txt
npx license-checker --production --direct --relativeLicensePath >> has_license.txt

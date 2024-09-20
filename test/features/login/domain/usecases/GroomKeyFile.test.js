//
// Copyright 2024 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import GroomKeyFile from 'helix-auth-svc/lib/features/login/domain/usecases/GroomKeyFile.js'

describe('GroomKeyFile use case', function () {
  const usecase = GroomKeyFile()

  it('should raise an error for invalid input', function () {
    try {
      usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should emit nothing if not a valid PEM certificate', function () {
    const input = `this is
just a plain
text file`
    const result = usecase(input)
    assert.equal(result, '')
  })

  it('should pass good data through unchanged', function () {
    const input = `-----BEGIN CERTIFICATE-----
MIIErDCCApQCCQCVmh2sP3DTFTANBgkqhkiG9w0BAQsFADAYMRYwFAYDVQQDDA1G
YWtlQXV0aG9yaXR5MB4XDTIxMTEwODIyMTUxM1oXDTMxMTEwNjIyMTUxM1owGDEW
MBQGA1UEAwwNRmFrZUF1dGhvcml0eTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCC
AgoCggIBAMOEBc0Oq+PoxrWiNIkXtOF68hkTi0gWpW3WNkFyWr5lx2zts/WPt+5H
Mr2VOvabmT6oQBOOed2uknBRGVjxoY9cGYdVzfPuTYmKf1+lr+rQkIrlWv9b68Dl
iExG+413Uyc+ete0cP10F8o+3pOC3vZjkWNn7syxP0jJSVH5e8zrbbkp+iyIpVo2
DffEJywxvCnEA0guWBVWHp6PavYNGF8MmmWWM0PCqBlBkCB6PD59JCXwIMvLkZcf
aXYxzGfL62B1zqY++w7ffqueVEhLbxAA9KParbg0cZVUaK3pfPf+k1Rpr0xCv0rt
+j4DjjZ1xYmw/kmveo4Xd50fKdmBkoJeApvfMbemR8zPGF9jbYej2l7JZ33oMocz
MlD35+K2NzWDlu63Lw61xemn3XBaScxV9tbfXSlsHKABIOd+VnJG0ZJCEaDwkG34
bKWV2loDnSAWF1jSkULFgVqpYR7diFnZTvM66VbnqrrcGHqmELWCrYtOJQv10lCQ
fsmMjfD5eRpDEVIbmMqS+3DeWdtizpG6CJqL05SmAgR3UTIcldyl5FetJWH9EWBQ
KIFRK2ZYO5kAjj5GbTF31gaTocqqjfSu12Db9Hxqp6dzFgp5MfDcL3+Uqw7NB+56
o0VotdJ5UkrUqG4F7E6BMOmoa6uHnncwLiS3ZwXtpaqxPP1TZXgZAgMBAAEwDQYJ
KoZIhvcNAQELBQADggIBAANyx6Hg9LmwIS8jA525ddxS83FOK886xdugtrZRHj/5
vZtVrBPYU+XLJEzDreLBIOVAiol3kABf83uQ7bQtamt58lZc+PJSMx2RhrS2T3+R
+gVZLL6m347HGbl+xg4VUiUwhLsfvyX92To0/Ibirte11FwKIAOPSC0XMauFz56q
BlsrrX5tnPmmtoFDIJVhw+5jidouqpMAh05COi4buNfWW1UMbXTHZ7ZjhdVNULXV
E+SBKpOrMAUKLDhBLGYcff/lZFJy42acoAV5PRzauNBVtj5LmnB3D8yw99VKniTD
tkJDU8vG7/dIF3qkGV7f9v0TAJ1XaicUPr04WwWrCHZ6Sgps68eCIYiIOerF43W9
oCut0uAbjq4TnvaPQstdVElCLJjAeMrjjhK9DsR7M39xqMMnB0FVVwXs1viVz+CE
72dgqV29Wd14dxMfmV7tcq2ccSOvO8BwyZz8rTYrhbuTCg2PKNuIZQ3/GZRU0inR
gyahMzg5NWD8gScaqv5zCEWgylDSdvGsaBu2nr7AjrkBgw4N0h6mhnwuCNAUT1GQ
6bmXOI+wv5OZY72tTfCopeSkgA1J7IP86tXnnevvast67xonQ749Qc6uqpsUIKN2
o/mqlYGsRE1PiIpwZ6gYLcQGeelJb3HNB4pHde5DHURNjPlEBMZOGhd+w6fLWNSP
-----END CERTIFICATE-----`
    const result = usecase(input)
    assert.equal(result, input)
  })

  it('should filter multiple instances of attributes', function () {
    const input = `PropertyName1: propertyValue
-----BEGIN CERTIFICATE-----
MIIErDCCApQCCQCVmh2sP3DTFTANBgkqhkiG9w0BAQsFADAYMRYwFAYDVQQDDA1G
YWtlQXV0aG9yaXR5MB4XDTIxMTEwODIyMTUxM1oXDTMxMTEwNjIyMTUxM1owGDEW
MBQGA1UEAwwNRmFrZUF1dGhvcml0eTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCC
gyahMzg5NWD8gScaqv5zCEWgylDSdvGsaBu2nr7AjrkBgw4N0h6mhnwuCNAUT1GQ
6bmXOI+wv5OZY72tTfCopeSkgA1J7IP86tXnnevvast67xonQ749Qc6uqpsUIKN2
o/mqlYGsRE1PiIpwZ6gYLcQGeelJb3HNB4pHde5DHURNjPlEBMZOGhd+w6fLWNSP
-----END CERTIFICATE-----
PropertyName2: propertyValue
-----BEGIN CERTIFICATE-----
MIIErDCCApQCCQCVmh2sP3DTFTANBgkqhkiG9w0BAQsFADAYMRYwFAYDVQQDDA1G
YWtlQXV0aG9yaXR5MB4XDTIxMTEwODIyMTUxM1oXDTMxMTEwNjIyMTUxM1owGDEW
MBQGA1UEAwwNRmFrZUF1dGhvcml0eTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCC
gyahMzg5NWD8gScaqv5zCEWgylDSdvGsaBu2nr7AjrkBgw4N0h6mhnwuCNAUT1GQ
6bmXOI+wv5OZY72tTfCopeSkgA1J7IP86tXnnevvast67xonQ749Qc6uqpsUIKN2
o/mqlYGsRE1PiIpwZ6gYLcQGeelJb3HNB4pHde5DHURNjPlEBMZOGhd+w6fLWNSP
-----END CERTIFICATE-----
PropertyName3: propertyValue`
    const expected = `-----BEGIN CERTIFICATE-----
MIIErDCCApQCCQCVmh2sP3DTFTANBgkqhkiG9w0BAQsFADAYMRYwFAYDVQQDDA1G
YWtlQXV0aG9yaXR5MB4XDTIxMTEwODIyMTUxM1oXDTMxMTEwNjIyMTUxM1owGDEW
MBQGA1UEAwwNRmFrZUF1dGhvcml0eTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCC
gyahMzg5NWD8gScaqv5zCEWgylDSdvGsaBu2nr7AjrkBgw4N0h6mhnwuCNAUT1GQ
6bmXOI+wv5OZY72tTfCopeSkgA1J7IP86tXnnevvast67xonQ749Qc6uqpsUIKN2
o/mqlYGsRE1PiIpwZ6gYLcQGeelJb3HNB4pHde5DHURNjPlEBMZOGhd+w6fLWNSP
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIErDCCApQCCQCVmh2sP3DTFTANBgkqhkiG9w0BAQsFADAYMRYwFAYDVQQDDA1G
YWtlQXV0aG9yaXR5MB4XDTIxMTEwODIyMTUxM1oXDTMxMTEwNjIyMTUxM1owGDEW
MBQGA1UEAwwNRmFrZUF1dGhvcml0eTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCC
gyahMzg5NWD8gScaqv5zCEWgylDSdvGsaBu2nr7AjrkBgw4N0h6mhnwuCNAUT1GQ
6bmXOI+wv5OZY72tTfCopeSkgA1J7IP86tXnnevvast67xonQ749Qc6uqpsUIKN2
o/mqlYGsRE1PiIpwZ6gYLcQGeelJb3HNB4pHde5DHURNjPlEBMZOGhd+w6fLWNSP
-----END CERTIFICATE-----`
    const result = usecase(input)
    assert.equal(result, expected)
  })

  it('should remove attribute data preceding encapsulation boundaries', function () {
    // note that internal whitespace is irrelevant and passed through
    const input = `
Private-Key: (4096 bit, 2 primes)
modulus:
    00:c2:d1:68:6e:8d:73:b3:82:22:91:04:5b:6e:df:
    1e:ea:1b
-----BEGIN PRIVATE KEY-----
MIIJQgIBADANBgkqhkiG9w0BAQEFAASCCSwwggkoAgEAAoICAQDC0WhujXOzgiKR
ds ig Rf gvi 2tB GZ2J eCJj gQKCA QEA7F 7Y1O6QF SIdBa    j0wtSdRCHY/yxkKPFSrfvj
tx1iI8qa4eJRH7uOomwYTSVF7bc6hQ==
-----END PRIVATE KEY-----
`
    const result = usecase(input)
    const expected = `-----BEGIN PRIVATE KEY-----
MIIJQgIBADANBgkqhkiG9w0BAQEFAASCCSwwggkoAgEAAoICAQDC0WhujXOzgiKR
ds ig Rf gvi 2tB GZ2J eCJj gQKCA QEA7F 7Y1O6QF SIdBa    j0wtSdRCHY/yxkKPFSrfvj
tx1iI8qa4eJRH7uOomwYTSVF7bc6hQ==
-----END PRIVATE KEY-----`
    assert.equal(result, expected)
  })
})

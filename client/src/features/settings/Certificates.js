//
// Copyright 2022 Perforce Software
//
import React from 'react'
import { Container, Stack, Typography } from '@mui/material'
import TextInputField from './TextInputField'

export const deserialize = (incoming, values) => {
  values['c_ca_cert'] = incoming['CA_CERT'] || ''
  values['c_cert'] = incoming['CERT'] || ''
  values['c_key'] = incoming['KEY'] || ''
  values['c_password'] = incoming['KEY_PASSPHRASE'] || ''
}

export const serialize = (values, outgoing) => {
  outgoing['CA_CERT'] = values['c_ca_cert']
  outgoing['CERT'] = values['c_cert']
  outgoing['KEY'] = values['c_key']
  outgoing['KEY_PASSPHRASE'] = values['c_password']
}

export const validate = (values, errors) => {
  if (values.c_ca_cert) {
    const lines = values.c_ca_cert.split('\n')
    if (lines.length < 3) {
      errors.c_ca_cert = 'Certificates must have 3+ lines'
    }
    if (!hasValidCertArmor(lines)) {
      errors.c_ca_cert = 'Certificates must have BEGIN/END armor'
    }
  }
  if (values.c_cert) {
    const lines = values.c_cert.split('\n')
    if (lines.length < 3) {
      errors.c_ca_cert = 'Certificates must have 3+ lines'
    }
    if (!hasValidCertArmor(lines)) {
      errors.c_ca_cert = 'Certificates must have BEGIN/END armor'
    }
  }
  if (values.c_key) {
    const lines = values.c_key.split('\n')
    if (lines.length < 3) {
      errors.c_ca_cert = 'Private keys must have 3+ lines'
    }
    if (!hasValidKeyArmor(lines)) {
      errors.c_key = 'Private keys must have BEGIN/END armor'
    }
  }
}

export const Component = ({ props }) => {
  return (
    <Container>
      <Stack spacing={2}>
        <Typography variant="h4" sx={{ borderTop: 1, borderColor: 'grey.500' }}>
          Certificates
        </Typography>
        <Typography>The certificates and keys below should be in PEM format.</Typography>
        <TextInputField
          name="c_ca_cert"
          values={props.values}
          errors={props.errors}
          touched={props.touched}
          label="Certificate Authority"
          onChange={props.handleChange}
          onBlur={props.handleBlur}
          rows={6}
        />
        <TextInputField
          name="c_cert"
          values={props.values}
          errors={props.errors}
          touched={props.touched}
          label="Public key"
          onChange={props.handleChange}
          onBlur={props.handleBlur}
          rows={6}
        />
        <TextInputField
          name="c_key"
          values={props.values}
          errors={props.errors}
          touched={props.touched}
          label="Private key"
          onChange={props.handleChange}
          onBlur={props.handleBlur}
          rows={6}
        />
        <Typography>If the private key is encrypted, provide the passphrase below.</Typography>
        <TextInputField
          name="c_password"
          values={props.values}
          errors={props.errors}
          touched={props.touched}
          label="Private key passphrase"
          onChange={props.handleChange}
          onBlur={props.handleBlur}
        />
      </Stack>
    </Container>
  )
}

function hasValidCertArmor(lines) {
  const firstLine = lines[0]
  const lastLine = lines[lines.length - 1]
  if (firstLine === '-----BEGIN CERTIFICATE-----' && lastLine === '-----END CERTIFICATE-----') {
    return true
  }
  if (firstLine === '-----BEGIN PUBLIC KEY-----' && lastLine === '-----END PUBLIC KEY-----') {
    return true
  }
  return false
}

function hasValidKeyArmor(lines) {
  const firstLine = lines[0]
  const lastLine = lines[lines.length - 1]
  if (firstLine === '-----BEGIN PRIVATE KEY-----' && lastLine === '-----END PRIVATE KEY-----') {
    return true
  }
  if (firstLine === '-----BEGIN RSA PRIVATE KEY-----' && lastLine === '-----END RSA PRIVATE KEY-----') {
    return true
  }
  if (firstLine === '-----BEGIN ENCRYPTED PRIVATE KEY-----' && lastLine === '-----END ENCRYPTED PRIVATE KEY-----') {
    return true
  }
  return false
}

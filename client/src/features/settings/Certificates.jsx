//
// Copyright 2023 Perforce Software
//
import React from 'react'
import { useFormContext } from 'react-hook-form'
import {
  Container,
  FormControl,
  FormHelperText,
  InputLabel,
  OutlinedInput,
  Stack,
  Typography
} from '@mui/material'

export const deserialize = (incoming, values) => {
  values['c_ca_cert'] = incoming['CA_CERT'] || ''
  values['c_cert'] = incoming['CERT'] || ''
  values['c_key'] = incoming['KEY'] || ''
  values['c_password'] = incoming['KEY_PASSPHRASE'] || ''
}

export const serialize = (values, outgoing) => {
  // only output serialized values if they were modified
  if ('c_ca_cert' in values) {
    outgoing['CA_CERT'] = values['c_ca_cert']
  }
  if ('c_cert' in values) {
    outgoing['CERT'] = values['c_cert']
  }
  if ('c_key' in values) {
    outgoing['KEY'] = values['c_key']
  }
  if ('c_password' in values) {
    outgoing['KEY_PASSPHRASE'] = values['c_password']
  }
}

function hasThreeOrMoreLines(v) {
  const lines = v.split('\n')
  return lines.length >= 3
}

function hasValidCertArmor(v) {
  const lines = v.split('\n')
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

function hasValidKeyArmor(v) {
  const lines = v.split('\n')
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

export const Component = () => {
  const { register, formState: { errors, touchedFields } } = useFormContext()
  return (
    <Container>
      <Stack spacing={2}>
        <Typography variant="h4" sx={{ borderTop: 1, borderColor: 'grey.500' }}>
          Certificates
        </Typography>
        <Typography>The certificates and keys below should be in PEM format.</Typography>
        <FormControl error={errors["c_ca_cert"] && touchedFields["c_ca_cert"]}>
          <InputLabel htmlFor="c_ca_cert-field">Certificate Authority</InputLabel>
          <OutlinedInput
            type="text"
            id="c_ca_cert-field"
            name="c_ca_cert"
            label="Certificate Authority"
            multiline={true}
            rows={6}
            {...register("c_ca_cert", {
              validate: {
                length: hasThreeOrMoreLines, armor: hasValidCertArmor
              }
            })}
          />
          <FormHelperText>{
            (errors.c_ca_cert?.type === 'length' && 'Certificates must have 3+ lines') ||
            (errors.c_ca_cert?.type === 'armor' && 'Certificates must have BEGIN/END armor')
          }</FormHelperText>
        </FormControl>
        <FormControl error={errors["c_cert"] && touchedFields["c_cert"]}>
          <InputLabel htmlFor="c_cert-field">Public key</InputLabel>
          <OutlinedInput
            type="text"
            id="c_cert-field"
            name="c_cert"
            label="Public key"
            multiline={true}
            rows={6}
            {...register("c_cert", {
              validate: {
                length: hasThreeOrMoreLines, armor: hasValidCertArmor
              }
            })}
          />
          <FormHelperText>{
            (errors.c_cert?.type === 'length' && 'Certificates must have 3+ lines') ||
            (errors.c_cert?.type === 'armor' && 'Certificates must have BEGIN/END armor')
          }</FormHelperText>
        </FormControl>
        <FormControl error={errors["c_key"] && touchedFields["c_key"]}>
          <InputLabel htmlFor="c_key-field">Private key</InputLabel>
          <OutlinedInput
            type="text"
            id="c_key-field"
            name="c_key"
            label="Private key"
            multiline={true}
            rows={6}
            {...register("c_key", {
              validate: {
                length: hasThreeOrMoreLines, armor: hasValidKeyArmor
              }
            })}
          />
          <FormHelperText>{
            (errors.c_key?.type === 'length' && 'Private keys must have 3+ lines') ||
            (errors.c_key?.type === 'armor' && 'Private keys must have BEGIN/END armor')
          }</FormHelperText>
        </FormControl>
        <Typography>If the private key is encrypted, provide the passphrase below.</Typography>
        <FormControl error={errors["c_password"] && touchedFields["c_password"]}>
          <InputLabel htmlFor="c_password-field">Private key passphrase</InputLabel>
          <OutlinedInput
            type="text"
            id="c_password-field"
            name="c_password"
            label="Private key passphrase"
            {...register("c_password")}
          />
        </FormControl>
      </Stack>
    </Container>
  )
}

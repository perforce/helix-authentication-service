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
  values['s_url'] = incoming['SAML_IDP_METADATA_URL'] || ''
  values['s_issuer'] = incoming['SAML_SP_ENTITY_ID'] || ''
  values['s_idpIssuer'] = incoming['SAML_IDP_ENTITY_ID'] || ''
  values['s_entryPoint'] = incoming['SAML_IDP_SSO_URL'] || ''
  values['s_idpMetadata'] = incoming['SAML_IDP_METADATA'] || ''
}

export const serialize = (values, outgoing) => {
  // only output serialized values if they were modified
  if ('s_idpMetadata' in values) {
    outgoing['SAML_IDP_METADATA'] = values['s_idpMetadata']
  }
  if ('s_url' in values) {
    outgoing['SAML_IDP_METADATA_URL'] = values['s_url']
  }
  if ('s_issuer' in values) {
    outgoing['SAML_SP_ENTITY_ID'] = values['s_issuer']
  }
  if ('s_idpIssuer' in values) {
    outgoing['SAML_IDP_ENTITY_ID'] = values['s_idpIssuer']
  }
  if ('s_entryPoint' in values) {
    outgoing['SAML_IDP_SSO_URL'] = values['s_entryPoint']
  }
}

export const Component = () => {
  const { register, formState: { errors, touchedFields } } = useFormContext()
  return (
    <Container>
      <Stack spacing={2}>
        <Typography variant="h4" sx={{ borderTop: 1, borderColor: 'grey.500' }}>
          SAML 2.0
        </Typography>
        <Typography>
          If the identity provider offers a metadata URL, provide that below.
        </Typography>
        <FormControl error={errors["s_url"] && touchedFields["s_url"]}>
          <InputLabel htmlFor="s_url-field">IdP Metadata URL</InputLabel>
          <OutlinedInput
            type="text"
            id="s_url-field"
            name="s_url"
            label="IdP Metadata URL"
            {...register("s_url", { pattern: /^https?:\/\/.+/ })}
          />
          <FormHelperText>{
            errors.s_url?.type === 'pattern' && 'URL must begin with http:// or https://'
          }</FormHelperText>
        </FormControl>
        <Typography>
          If the identity provider offers a metadata as text only, provide that below.
        </Typography>
        <FormControl error={errors["s_idpMetadata"] && touchedFields["s_idpMetadata"]}>
          <InputLabel htmlFor="s_idpMetadata-field">IdP Metadata</InputLabel>
          <OutlinedInput
            type="text"
            id="s_idpMetadata-field"
            name="s_idpMetadata"
            label="IdP Metadata"
            multiline={true}
            rows={6}
            {...register("s_idpMetadata")}
          />
        </FormControl>
        <Typography>
          Identifier for this service as registered with the IdP, this is typically the URL for service.
        </Typography>
        <FormControl error={errors["s_issuer"] && touchedFields["s_issuer"]}>
          <InputLabel htmlFor="s_issuer-field">SP Entity ID</InputLabel>
          <OutlinedInput
            type="text"
            id="s_issuer-field"
            name="s_issuer"
            label="SP Entity ID"
            {...register("s_issuer")}
          />
        </FormControl>
        <Typography>
          Identifier for the Identity Provider.
          If the metadata URL is specified, then this field can be left blank.
        </Typography>
        <FormControl error={errors["s_idpIssuer"] && touchedFields["s_idpIssuer"]}>
          <InputLabel htmlFor="s_idpIssuer-field">IdP Entity ID</InputLabel>
          <OutlinedInput
            type="text"
            id="s_idpIssuer-field"
            name="s_idpIssuer"
            label="IdP Entity ID"
            {...register("s_idpIssuer")}
          />
        </FormControl>
        <Typography>
          Single-Sign-On URL of the Identity Provider.
          If the metadata URL is specified, then this field can be left blank.
        </Typography>
        <FormControl error={errors["s_entryPoint"] && touchedFields["s_entryPoint"]}>
          <InputLabel htmlFor="s_entryPoint-field">Single Sign On URL</InputLabel>
          <OutlinedInput
            type="text"
            id="s_entryPoint-field"
            name="s_entryPoint"
            label="Single Sign On URL"
            {...register("s_entryPoint", { pattern: /^https?:\/\/.+/ })}
          />
          <FormHelperText>{
            errors.s_entryPoint?.type === 'pattern' && 'URL must begin with http:// or https://'
          }</FormHelperText>
        </FormControl>
      </Stack>
    </Container>
  )
}

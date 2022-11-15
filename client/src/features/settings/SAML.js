//
// Copyright 2022 Perforce Software
//
import React from 'react'
import { Container, Stack, Typography } from '@mui/material'
import TextInputField from './TextInputField'

export const deserialize = (incoming, values) => {
  values['s_url'] = incoming['SAML_IDP_METADATA_URL'] || ''
  values['s_issuer'] = incoming['SAML_SP_ENTITY_ID'] || ''
  values['s_idpIssuer'] = incoming['SAML_IDP_ENTITY_ID'] || ''
  values['s_entryPoint'] = incoming['SAML_IDP_SSO_URL'] || ''
}

export const serialize = (values, outgoing) => {
  outgoing['SAML_IDP_METADATA_URL'] = values['s_url']
  outgoing['SAML_SP_ENTITY_ID'] = values['s_issuer']
  outgoing['SAML_IDP_ENTITY_ID'] = values['s_idpIssuer']
  outgoing['SAML_IDP_SSO_URL'] = values['s_entryPoint']
}

export const validate = (values, errors) => {
  if (values.url && !/^https?:\/\/.+/.test(values.url)) {
    errors.url = 'Must start with http:// or https://'
  }
  if (values.entryPoint && !/^https?:\/\/.+/.test(values.entryPoint)) {
    errors.entryPoint = 'Must start with http:// or https://'
  }
}

export const Component = ({ props }) => {
  return (
    <Container>
      <Stack spacing={2}>
        <Typography variant="h4" sx={{ borderTop: 1, borderColor: 'grey.500' }}>
          SAML 2.0
        </Typography>
        <Typography>
          If the identity provider offers a metadata URL, provide that below.
        </Typography>
        <TextInputField
          name="s_url"
          values={props.values}
          errors={props.errors}
          touched={props.touched}
          label="IdP Metadata URL"
          onChange={props.handleChange}
          onBlur={props.handleBlur}
        />
        <Typography>
          Identifier for this service as registered with the IdP, this is typically the URL for service.
        </Typography>
        <TextInputField
          name="s_issuer"
          values={props.values}
          errors={props.errors}
          touched={props.touched}
          label="SP Entity ID"
          onChange={props.handleChange}
          onBlur={props.handleBlur}
        />
        <Typography>
          Identifier for the Identity Provider.
          If the metadata URL is specified, then this field can be left blank.
        </Typography>
        <TextInputField
          name="s_idpIssuer"
          values={props.values}
          errors={props.errors}
          touched={props.touched}
          label="IdP Entity ID"
          onChange={props.handleChange}
          onBlur={props.handleBlur}
        />
        <Typography>
          Single-Sign-On URL of the Identity Provider.
          If the metadata URL is specified, then this field can be left blank.
        </Typography>
        <TextInputField
          name="s_entryPoint"
          values={props.values}
          errors={props.errors}
          touched={props.touched}
          label="Single Sign On URL"
          onChange={props.handleChange}
          onBlur={props.handleBlur}
        />
      </Stack>
    </Container>
  )
}

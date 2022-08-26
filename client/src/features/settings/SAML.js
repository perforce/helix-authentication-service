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
  values['s_logoutUrl'] = incoming['SAML_IDP_SLO_URL'] || ''
}

export const serialize = (values, outgoing) => {
  outgoing['SAML_IDP_METADATA_URL'] = values['s_url']
  outgoing['SAML_SP_ENTITY_ID'] = values['s_issuer']
  outgoing['SAML_IDP_ENTITY_ID'] = values['s_idpIssuer']
  outgoing['SAML_IDP_SSO_URL'] = values['s_entryPoint']
  outgoing['SAML_IDP_SLO_URL'] = values['s_logoutUrl']
}

export const validate = (values, errors) => {
  if (values.url && !/^https?:\/\/.+/.test(values.url)) {
    errors.url = 'Must start with http:// or https://'
  }
  if (values.entryPoint && !/^https?:\/\/.+/.test(values.entryPoint)) {
    errors.entryPoint = 'Must start with http:// or https://'
  }
  if (values.logoutUrl && !/^https?:\/\/.+/.test(values.logoutUrl)) {
    errors.logoutUrl = 'Must start with http:// or https://'
  }
}

export const Component = ({ props }) => {
  return (
    <Container>
      <Stack spacing={2}>
        <Typography variant="h4" sx={{ borderTop: 1, borderColor: 'grey.500' }}>
          SAML 2.0
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
        <TextInputField
          name="s_issuer"
          values={props.values}
          errors={props.errors}
          touched={props.touched}
          label="SP Entity ID"
          onChange={props.handleChange}
          onBlur={props.handleBlur}
        />
        <TextInputField
          name="s_idpIssuer"
          values={props.values}
          errors={props.errors}
          touched={props.touched}
          label="IdP Entity ID"
          onChange={props.handleChange}
          onBlur={props.handleBlur}
        />
        <TextInputField
          name="s_entryPoint"
          values={props.values}
          errors={props.errors}
          touched={props.touched}
          label="Single Sign On URL"
          onChange={props.handleChange}
          onBlur={props.handleBlur}
        />
        <TextInputField
          name="s_logoutUrl"
          values={props.values}
          errors={props.errors}
          touched={props.touched}
          label="Logout URL"
          onChange={props.handleChange}
          onBlur={props.handleBlur}
        />
      </Stack>
    </Container>
  )
}

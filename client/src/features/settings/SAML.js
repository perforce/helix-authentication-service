//
// Copyright 2022 Perforce Software
//
import React from 'react'
import { Form, Formik } from 'formik'
import { Alert, Container, Stack } from '@mui/material'
import { useSelector } from 'react-redux'
import { selectFetched } from 'features/settings/settingsSlice'
import AutoApplyChanges from './AutoApplyChanges'
import TextInputField from './TextInputField'

const deserialize = (incoming) => {
  return {
    url: incoming['SAML_IDP_METADATA_URL'] || '',
    issuer: incoming['SAML_SP_ENTITY_ID'] || '',
    idpIssuer: incoming['SAML_IDP_ENTITY_ID'] || '',
    entryPoint: incoming['SAML_IDP_SSO_URL'] || '',
    logoutUrl: incoming['SAML_IDP_SLO_URL'] || ''
  }
}

const serialize = (outgoing) => {
  return {
    SAML_IDP_METADATA_URL: outgoing['url'],
    SAML_SP_ENTITY_ID: outgoing['issuer'],
    SAML_IDP_ENTITY_ID: outgoing['idpIssuer'],
    SAML_IDP_SSO_URL: outgoing['entryPoint'],
    SAML_IDP_SLO_URL: outgoing['logoutUrl']
  }
}

export const SAML = () => {
  const fetched = useSelector(selectFetched)

  return fetched ? (
    <Formik
      initialValues={deserialize(fetched)}
      validate={values => {
        const errors = {}
        if (values.url && !/^https?:\/\/.+/.test(values.url)) {
          errors.url = 'Must start with http:// or https://'
        }
        if (values.entryPoint && !/^https?:\/\/.+/.test(values.entryPoint)) {
          errors.entryPoint = 'Must start with http:// or https://'
        }
        if (values.logoutUrl && !/^https?:\/\/.+/.test(values.logoutUrl)) {
          errors.logoutUrl = 'Must start with http:// or https://'
        }
        return errors
      }}
    >
      {(props) => (
        <Form>
          <Container>
            <Stack spacing={2}>
              <TextInputField
                name="url"
                values={props.values}
                errors={props.errors}
                touched={props.touched}
                label="IdP Metadata URL"
                onChange={props.handleChange}
                onBlur={props.handleBlur}
              />
              <TextInputField
                name="issuer"
                values={props.values}
                errors={props.errors}
                touched={props.touched}
                label="SP Entity ID"
                onChange={props.handleChange}
                onBlur={props.handleBlur}
              />
              <TextInputField
                name="idpIssuer"
                values={props.values}
                errors={props.errors}
                touched={props.touched}
                label="IdP Entity ID"
                onChange={props.handleChange}
                onBlur={props.handleBlur}
              />
              <TextInputField
                name="entryPoint"
                values={props.values}
                errors={props.errors}
                touched={props.touched}
                label="Single Sign On URL"
                onChange={props.handleChange}
                onBlur={props.handleBlur}
              />
              <TextInputField
                name="logoutUrl"
                values={props.values}
                errors={props.errors}
                touched={props.touched}
                label="Logout URL"
                onChange={props.handleChange}
                onBlur={props.handleBlur}
              />
            </Stack>
          </Container>
          <AutoApplyChanges serialize={serialize} />
        </Form>
      )}
    </Formik>
  ) : (
    <Alert severity="info">Waiting for settings...</Alert>
  )
}

export default SAML

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
    issuer: incoming['OIDC_ISSUER_URI'] || '',
    client: incoming['OIDC_CLIENT_ID'] || '',
    secret: incoming['OIDC_CLIENT_SECRET'] || ''
  }
}

const serialize = (outgoing) => {
  return {
    OIDC_ISSUER_URI: outgoing['issuer'],
    OIDC_CLIENT_ID: outgoing['client'],
    OIDC_CLIENT_SECRET: outgoing['secret'],
  }
}

export const OpenID = () => {
  const fetched = useSelector(selectFetched)

  return fetched ? (
    <Formik
      initialValues={deserialize(fetched)}
      validate={values => {
        const errors = {}
        if (values.issuer && !/^https?:\/\/.+/.test(values.issuer)) {
          errors.issuer = 'Must start with http:// or https://'
        }
        return errors
      }}
    >
      {(props) => (
        <Form>
          <Container>
            <Stack spacing={2}>
              <TextInputField
                name="issuer"
                values={props.values}
                errors={props.errors}
                touched={props.touched}
                label="Issuer URI"
                onChange={props.handleChange}
                onBlur={props.handleBlur}
              />
              <TextInputField
                name="client"
                values={props.values}
                errors={props.errors}
                touched={props.touched}
                label="Client identifier"
                onChange={props.handleChange}
                onBlur={props.handleBlur}
              />
              <TextInputField
                name="secret"
                values={props.values}
                errors={props.errors}
                touched={props.touched}
                label="Client secret"
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

export default OpenID

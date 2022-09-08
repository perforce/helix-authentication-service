//
// Copyright 2022 Perforce Software
//
import React, { useState } from 'react'
import { Form, Formik } from 'formik'
import { Alert, Button, Container, Stack } from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { useDispatch, useSelector } from 'react-redux'
import { useGetSettingsQuery, useSendChangesMutation } from 'app/services/auth'
import { discardChanges, selectModified } from 'features/settings/settingsSlice'
import AutoApplyChanges from './AutoApplyChanges'
import * as General from './General'
import * as OpenID from './OpenID'
import * as SAML from './SAML'

const deserialize = (incoming) => {
  const values = {}
  General.deserialize(incoming, values)
  OpenID.deserialize(incoming, values)
  SAML.deserialize(incoming, values)
  return values
}

const serialize = (values) => {
  const outgoing = {}
  General.serialize(values, outgoing)
  OpenID.serialize(values, outgoing)
  SAML.serialize(values, outgoing)
  return outgoing
}

const validate = (values) => {
  const errors = {}
  General.validate(values, errors)
  OpenID.validate(values, errors)
  SAML.validate(values, errors)
  return errors
}

export const AllSettings = () => {
  const dispatch = useDispatch()
  const { data, error, refetch } = useGetSettingsQuery()
  const [applyStatus, setApplyStatus] = useState(null)
  const [applyError, setApplyError] = useState(null)
  const [sendChanges, { isFetching }] = useSendChangesMutation()
  const modified = useSelector(selectModified)

  const handleSendChanges = (event) => {
    event.preventDefault()
    setTimeout(() => {
      if (modified) {
        sendChanges(modified).unwrap()
          .then(() => setApplyStatus('Settings updated successfully'))
          .catch((err) => setApplyError(err.data || 'Oh no, there was an error!'))
      }
    }, 100)
  }

  const openLoginPage = (event) => {
    event.preventDefault()
    fetch('/requests/new/test')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to get login URL (status ${response.status})`)
        }
        return response.json()
      })
      .then((response) => {
        window.open(response.loginTestUrl, '_blank')
      })
      .catch((err) => {
        setApplyError(err.message)
      })
  }

  return data ? (
    <Container maxWidth="lg" sx={{ my: 2 }}>
      {applyError && <Alert severity="error">{applyError}</Alert>}
      {
        applyStatus &&
        <Alert severity="info" onClose={
          () => setApplyStatus(null)
        }>{applyStatus}</Alert>
      }
      <Formik
        initialValues={deserialize(data)}
        validate={validate}
      >
        {(props) => (
          <Form>
            <Stack spacing={4} sx={{ m: "2rem" }}>
              <General.Component props={props} />
              <OpenID.Component props={props} />
              <SAML.Component props={props} />
            </Stack>
            <AutoApplyChanges serialize={serialize} />
            <Stack direction="row" spacing={2} justifyContent="space-around">
              <LoadingButton
                onClick={handleSendChanges}
                type="submit"
                variant="contained"
                disabled={modified === null || Object.entries(modified).length === 0}
                loading={isFetching}
              >
                Apply Changes
              </LoadingButton>
              <Button
                onClick={openLoginPage}
                variant="outlined"
                disabled={modified !== null && Object.entries(modified).length > 0}
              >
                Test login
              </Button>
              <LoadingButton
                onClick={(event) => {
                  event.preventDefault()
                  dispatch(discardChanges())
                  refetch()
                  props.resetForm()
                }}
                variant="contained"
                disabled={modified === null || Object.entries(modified).length === 0}
                loading={isFetching}
              >
                Discard Changes
              </LoadingButton>
            </Stack>
          </Form>
        )}
      </Formik>
    </Container>
  ) : error ? (
    <Alert severity="error">{error}</Alert>
  ) : (
    <Alert severity="info">Fetching settings...</Alert>
  )
}

export default AllSettings

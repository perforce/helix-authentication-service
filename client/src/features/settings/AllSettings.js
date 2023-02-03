//
// Copyright 2023 Perforce Software
//
import React, { useState } from 'react'
import { Form, Formik } from 'formik'
import { Alert, Container, Stack } from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { useDispatch, useSelector } from 'react-redux'
import {
  useGetSettingsQuery,
  useSendChangesMutation,
  useTestChangesMutation,
  useResetChangesMutation
} from 'app/services/auth'
import { discardChanges, selectModified } from 'features/settings/settingsSlice'
import AutoApplyChanges from './AutoApplyChanges'
import * as Certificates from './Certificates'
import * as General from './General'
import * as OpenID from './OpenID'
import * as SAML from './SAML'

const deserialize = (incoming) => {
  const values = {}
  General.deserialize(incoming, values)
  OpenID.deserialize(incoming, values)
  SAML.deserialize(incoming, values)
  Certificates.deserialize(incoming, values)
  return values
}

const serialize = (values) => {
  const outgoing = {}
  General.serialize(values, outgoing)
  OpenID.serialize(values, outgoing)
  SAML.serialize(values, outgoing)
  Certificates.serialize(values, outgoing)
  return outgoing
}

const validate = (values) => {
  const errors = {}
  General.validate(values, errors)
  OpenID.validate(values, errors)
  SAML.validate(values, errors)
  Certificates.validate(values, errors)
  return errors
}

export const AllSettings = () => {
  const dispatch = useDispatch()
  const { data, error } = useGetSettingsQuery()
  const [applyStatus, setApplyStatus] = useState(null)
  const [applyError, setApplyError] = useState(null)
  const [sendChanges, { isSendFetching }] = useSendChangesMutation()
  const [testChanges, { isTestFetching }] = useTestChangesMutation()
  const [resetChanges, { isResetFetching }] = useResetChangesMutation()
  const modified = useSelector(selectModified)

  const handleSendChanges = (event) => {
    event.preventDefault()
    setTimeout(() => {
      if (modified) {
        sendChanges(modified).unwrap()
          .then((data) => {
            const href = `${data.location}/admin`
            setApplyStatus(<div>
              Settings updated successfully. Open the new <a href={href}>location</a> if it has been changed.
            </div>)
          })
          .catch((err) => {
            if (err.data) {
              setApplyError(JSON.stringify(err.data))
            } else {
              setApplyError('Oh no, there was an error!')
            }
          })
      }
    }, 100)
  }

  const handleTestChanges = (event) => {
    event.preventDefault()
    setTimeout(() => {
      if (modified) {
        testChanges(modified).unwrap()
          .then((data) => {
            const href = `${data.location}/admin`
            setApplyStatus(<div>
              Temporary settings updated successfully. Open the new <a href={href}>location</a> if it has been changed.
            </div>)
          })
          .catch((err) => {
            if (err.data) {
              setApplyError(JSON.stringify(err.data))
            } else {
              setApplyError('Oh no, there was an error!')
            }
          })
      }
    }, 100)
  }

  const handleResetChanges = (event) => {
    event.preventDefault()
    setTimeout(() => {
      resetChanges().unwrap()
        .then((data) => {
          const href = `${data.location}/admin`
          setApplyStatus(<div>
            Temporary settings removed. Open the new <a href={href}>location</a> if it has been changed.
          </div>)
        })
        .catch((err) => {
          if (err.data) {
            setApplyError(JSON.stringify(err.data))
          } else {
            setApplyError('Oh no, there was an error!')
          }
        })
    }, 100)
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
              <Certificates.Component props={props} />
            </Stack>
            <AutoApplyChanges serialize={serialize} />
            <Stack direction="row" spacing={2} justifyContent="space-around">
              <LoadingButton
                onClick={handleSendChanges}
                type="submit"
                variant="contained"
                loading={isSendFetching}
              >
                Apply Changes
              </LoadingButton>
              <LoadingButton
                onClick={handleTestChanges}
                type="submit"
                variant="outlined"
                loading={isTestFetching}
              >
                Test Changes
              </LoadingButton>
              <LoadingButton
                onClick={(event) => {
                  handleResetChanges(event)
                  dispatch(discardChanges())
                  props.resetForm()
                }}
                variant="contained"
                loading={isResetFetching}
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

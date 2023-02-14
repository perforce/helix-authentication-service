//
// Copyright 2023 Perforce Software
//
import React, { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Alert, Container, Stack } from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { useDispatch } from 'react-redux'
import {
  useGetSettingsQuery,
  useSendChangesMutation,
  useResetChangesMutation
} from 'app/services/auth'
import { discardChanges } from 'features/settings/settingsSlice'
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

export const AllSettings = () => {
  const { data, error } = useGetSettingsQuery()

  return data ? (
    <AllComponent values={deserialize(data)} />
  ) : error ? (
    <Alert severity='error'>{JSON.stringify(error)}</Alert>
  ) : (
    <Alert severity='info'>Fetching settings...</Alert>
  )
}

const AllComponent = ({ values }) => {
  const dispatch = useDispatch()
  const methods = useForm({ mode: 'onBlur', values })
  const [applyStatus, setApplyStatus] = useState(null)
  const [applyError, setApplyError] = useState(null)
  const [sendChanges, { isSendFetching }] = useSendChangesMutation()
  const [resetChanges, { isResetFetching }] = useResetChangesMutation()

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

  const onSubmit = (data) => {
    // This is to avoid an infinite loop in which we dispatch the changed values
    // to redux, and then redux renders our form again, and then we dispatch the
    // changes again for some reason, etc.
    //
    // Collect all of the form values, then check each of their states to find
    // out if they are modified or not, and then "serialize" this and send to
    // redux to be pushed to the backend.
    const fieldValues = methods.getValues()
    const values = {}
    for (const field in fieldValues) {
      const fieldState = methods.getFieldState(field)
      if (fieldState.isDirty && !fieldState.invalid) {
        values[field] = fieldValues[field]
      }
    }
    const serialized = serialize(values)
    sendChanges(serialized).unwrap()
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

  return (
    <Container maxWidth='lg' sx={{ my: 2 }}>
      {applyError && <Alert severity='error'>{applyError}</Alert>}
      {
        applyStatus &&
        <Alert severity='info' onClose={
          () => setApplyStatus(null)
        }>{applyStatus}</Alert>
      }
      <FormProvider {...methods} >
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <Stack spacing={4} sx={{ m: '2rem' }}>
            <General.Component />
            <OpenID.Component />
            <SAML.Component />
            <Certificates.Component />
          </Stack>
          <Stack direction='row' spacing={2} justifyContent='space-around'>
            <LoadingButton
              type='submit'
              variant='contained'
              loading={isSendFetching}
            >
              Apply Changes
            </LoadingButton>
            <LoadingButton
              onClick={(event) => {
                handleResetChanges(event)
                dispatch(discardChanges())
                methods.reset()
              }}
              variant='contained'
              loading={isResetFetching}
            >
              Discard Changes
            </LoadingButton>
          </Stack>
        </form>
      </FormProvider>
    </Container>
  )
}

export default AllSettings

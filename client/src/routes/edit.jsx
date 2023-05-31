//
// Copyright 2023 Perforce Software
//
import React, { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { useLoaderData, useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  Container,
  Stack
} from '@mui/material'
import {
  useGetOneProviderQuery,
  usePutProviderMutation
} from '~/app/services/auth'
import OidcEditor from '~/components/OidcEditor'
import SamlEditor from '~/components/SamlEditor'

export async function loader({ params }) {
  // React Router would like for us to make a remote call here using the
  // provided parameters, but doing so with the hook-based RTK Query seems
  // awkward at best.
  return { providerId: params.id }
}

export default function Editor({ protocol }) {
  const navigate = useNavigate()
  const [applyError, setApplyError] = useState(null)
  const { providerId } = useLoaderData()
  const { data, error, isLoading } = useGetOneProviderQuery(providerId)
  const [putProvider] = usePutProviderMutation()
  const methods = useForm({ mode: 'onBlur', values: data })

  const onSubmit = (data) => {
    putProvider(data).unwrap()
      .then(() => {
        navigate('/')
      })
      .catch((err) => {
        if (err.data) {
          setApplyError(JSON.stringify(err.data))
        } else {
          setApplyError('Oh no, there was an error!')
        }
      })
  }

  if (isLoading) {
    return (
      <Alert severity='info'>Fetching {protocol.toUpperCase()} provider...</Alert>
    )
  } else if (error) {
    return (
      <Alert severity='error'>{JSON.stringify(error)}</Alert>
    )
  } else {
    return (
      <FormProvider {...methods} >
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <Container maxWidth='lg' sx={{ my: 4 }}>
            <Stack spacing={4} justifyContent="space-around">
              {applyError && <Alert severity='error'>{applyError}</Alert>}
              {protocol === 'saml' ? <SamlEditor /> : <OidcEditor />}
              <Stack spacing={4} direction="row">
                <Button onClick={() => navigate('/')} variant='outlined'>Cancel</Button>
                <Button type='submit' variant='contained'>Update</Button>
              </Stack>
            </Stack>
          </Container>
        </form>
      </FormProvider>
    )
  }
}

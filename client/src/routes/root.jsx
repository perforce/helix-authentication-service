//
// Copyright 2023 Perforce Software
//
import React from 'react'
import {
  Alert,
  Button,
  Container,
  Stack,
  Typography
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useGetAllProvidersQuery, useDeleteProviderMutation } from '~/app/services/auth'
import Providers from '~/components/Providers'

export default function Root() {
  const navigate = useNavigate()
  const { data, error, isLoading } = useGetAllProvidersQuery()
  const [deleteProvider] = useDeleteProviderMutation()

  const handleDelete = (providerId) => {
    deleteProvider(providerId)
  }

  if (isLoading) {
    return <Alert severity='info'>Fetching providers...</Alert>
  } else if (error) {
    if (typeof error === 'string') {
      throw new Error(error)
    } else {
      throw new Error(JSON.stringify(error))
    }
  } else {
    const providers = deserialize(data)
    if (providers.length === 0) {
      return (
        <Container maxWidth='sm' sx={{ my: 2 }}>
          <Stack spacing={4}>
            <Typography variant="h5">No Authentication Integrated</Typography>
            <Button onClick={() => navigate('/new')} variant='contained'>Add Authentication</Button>
          </Stack>
        </Container >
      )
    } else {
      return (
        <Container maxWidth='lg' sx={{ my: 2 }}>
          <Stack spacing={4}>
            <Stack direction="row" justifyContent="flex-end">
              <Button onClick={() => navigate('/new')} variant='contained'>Add Authentication</Button>
            </Stack>
            <Providers providers={providers} onDelete={handleDelete} />
          </Stack>
        </Container >
      )
    }
  }
}

function deserialize(data) {
  const providers = []
  if (data.providers && Array.isArray(data.providers)) {
    for (const provider of data.providers) {
      // ignore any providers that lack a label, they are not usable
      if (provider.label) {
        providers.push(provider)
      }
    }
  }
  return providers
}

//
// Copyright 2023 Perforce Software
//
import React from 'react'
import {
  Alert,
  Button,
  Container,
  Stack
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
    throw new Error(JSON.stringify(error))
  } else {
    const providers = deserialize(data)
    if (providers.length === 0) {
      return <div>no providers configured</div>
    } else {
      return (
        <Container maxWidth='lg' sx={{ my: 2 }}>
          <Stack spacing={4}>
            <Button onClick={() => navigate('/new')} variant='contained'>Add Authentication</Button>
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

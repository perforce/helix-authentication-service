//
// Copyright 2022 Perforce Software
//
import {
  Box,
  Container,
  Stack,
  Typography,
} from '@mui/material'
import { useGetSettingsQuery } from '~/app/services/auth'

function stringify (data) {
  const keys = Object.keys(data).sort()
  return keys.reduce((acc, key) => {
    const value = data[key]
    return acc.concat(`${key}=${value}\n`)
  }, '')
}

export function ShowAll() {
  const { data, error } = useGetSettingsQuery()

  return (
    <Container>
      <Stack>
        <Typography variant="h4" gutterBottom component="div">
          Service Settings
        </Typography>
        <Box>
          {data ? (
            <pre>{stringify(data)}</pre>
          ) : error ? (
            <pre>{JSON.stringify(error, null, 2)}</pre>
          ) : null}
        </Box>
      </Stack>
    </Container>
  )
}

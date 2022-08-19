//
// Copyright 2022 Perforce Software
//
import {
  Box,
  Container,
  Stack,
  Typography,
} from '@mui/material'
import { useGetSettingsQuery } from 'app/services/auth'

export function ShowAll() {
  const { data, error, isFetching } = useGetSettingsQuery()

  return (
    <Container>
      <Stack>
        <Typography variant="h3" gutterBottom component="div">
          Service Settings
        </Typography>
        <Box>
          {data ? (
            <>
              <Typography variant="h4" gutterBottom component="div">Data</Typography>
              <pre>{JSON.stringify(data, null, 2)}</pre>
              <div>{isFetching ? '...refetching' : ''}</div>
            </>
          ) : error ? (
            <>
              <Typography variant="h4" gutterBottom component="div">Error</Typography>
              <pre>{JSON.stringify(error, null, 2)}</pre>
            </>
          ) : null}
        </Box>
      </Stack>
    </Container>
  )
}

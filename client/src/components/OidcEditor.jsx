//
// Copyright 2023 Perforce Software
//
import React from 'react'
import {
  Controller,
  useFormContext
} from 'react-hook-form'
import { TabContext, TabList, TabPanel } from '@mui/lab';
import {
  Box,
  Checkbox,
  Container,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Grid,
  InputLabel,
  OutlinedInput,
  Stack,
  Tab,
  Tooltip,
  Typography
} from '@mui/material'
import PasswordInput from '~/components/PasswordInput'

// Must be contained within a FormProvider component.
export default function OidcEditor() {
  const [selectedTab, setSelectedTab] = React.useState('1')

  const selectTab = (event, newValue) => {
    setSelectedTab(newValue)
  }

  // The fixed height of 500px is a hack to get the container to be a consistent
  // size when switching tabs, preventing the buttons (in the parent element)
  // from moving up and down as the user switches tabs.
  return (
    <Container sx={{ height: "500px" }}>
      <Typography variant="h6" sx={{ py: 2 }}>
        Enter Details
      </Typography>
      <TabContext value={selectedTab}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <TabList onChange={selectTab}>
            <Tab label="Basic Integration" value="1" />
            <Tab label="Advanced Options" value="2" />
          </TabList>
        </Box>
        <TabPanel value="1">
          <BasicOptions />
        </TabPanel>
        <TabPanel value="2">
          <AdvancedOptions />
        </TabPanel>
      </TabContext>
    </Container>
  )
}

function BasicOptions() {
  const { control, formState: { errors, touchedFields } } = useFormContext()
  return (
    <Grid container spacing={4}>
      <Grid item xs={12}>
        <FormControl error={errors["issuerUri"] && touchedFields["issuerUri"]} fullWidth>
          <InputLabel htmlFor="issuer-uri">Issuer URI</InputLabel>
          <Controller control={control} name="issuerUri" rules={{ pattern: /^https?:\/\/.+/ }}
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <Tooltip title="URL from which the OIDC issuer configuration may be retrieved.">
                <OutlinedInput
                  type="text"
                  id="issuer-uri"
                  name="issuerUri"
                  label="Issuer URI"
                  onChange={onChange}
                  onBlur={onBlur}
                  value={value}
                  ref={ref}
                />
              </Tooltip>
            )} />
          <FormHelperText>{
            errors.issuerUri?.type === 'pattern' && 'URL must begin with http:// or https://'
          }</FormHelperText>
        </FormControl>
      </Grid>
      <Grid item xs={6}>
        <FormControl error={errors["clientId"] && touchedFields["clientId"]} fullWidth>
          <InputLabel htmlFor="client-id">Client ID</InputLabel>
          <Controller control={control} name="clientId" rules={{ required: true }}
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <Tooltip title="Unique identifier for this service, provided by the OIDC issuer.">
                <OutlinedInput
                  type="text"
                  id="client-id"
                  name="clientId"
                  label="Client ID"
                  onChange={onChange}
                  onBlur={onBlur}
                  value={value}
                  ref={ref}
                />
              </Tooltip>
            )} />
          <FormHelperText>{
            errors.clientId?.type === 'required' && 'Must provide an identifier'
          }</FormHelperText>
        </FormControl>
      </Grid>
      <Grid item xs={6}>
        <FormControl error={errors["clientSecret"] && touchedFields["clientSecret"]} fullWidth>
          <InputLabel htmlFor="client-secret">Client Secret</InputLabel>
          <Controller control={control} name="clientSecret" rules={{ required: true }}
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <PasswordInput
                name="clientSecret"
                label="Client Secret"
                onChange={onChange}
                onBlur={onBlur}
                value={value}
                forwardedRef={ref}
                tooltip="Secret value associated with the client ID, provided by the OIDC issuer."
              />
            )} />
          <FormHelperText>{
            errors.clientSecret?.type === 'required' && 'Must provide a secret value'
          }</FormHelperText>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <FormControl error={errors["maxAge"] && touchedFields["maxAge"]}>
          <InputLabel htmlFor="max-age">Max Session Age</InputLabel>
          <Controller control={control} name="maxAge"
            rules={{ validate: (value) => value === '' || parseInt(value, 10) >= 0 }}
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <Tooltip title="Maximum number of seconds for duration of authenticated session after which user must authenticate.">
                <OutlinedInput
                  type="number"
                  inputProps={{ step: 10 }}
                  id="max-age"
                  name="maxAge"
                  label="Max Session Age"
                  onChange={onChange}
                  onBlur={onBlur}
                  value={value}
                  ref={ref}
                />
              </Tooltip>
            )} />
          <FormHelperText>{
            errors.maxAge && 'Must be zero or higher'
          }</FormHelperText>
        </FormControl>
      </Grid>
    </Grid>
  )
}

function AdvancedOptions() {
  const { control, formState: { errors, touchedFields } } = useFormContext()

  return (
    <Stack spacing={4}>
      <Grid container spacing={4}>
        <Grid item xs={6}>
          <FormControl error={errors["codeChallenge"] && touchedFields["codeChallenge"]} fullWidth>
            <InputLabel htmlFor="code-challenge">Code Challenge Method</InputLabel>
            <Controller control={control} name="codeChallenge"
              render={({ field: { onChange, value, ref } }) => (
                <Tooltip title="May be 'S256' or 'plain', with 'S256' being the default.">
                  <OutlinedInput
                    type="text"
                    id="code-challenge"
                    name="codeChallenge"
                    label="Code Challenge Method"
                    onChange={onChange}
                    value={value}
                    ref={ref}
                  />
                </Tooltip>
              )} />
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <FormControl error={errors["signingAlgo"] && touchedFields["signingAlgo"]} fullWidth>
            <InputLabel htmlFor="signing-algo">Token Signing Algorithm</InputLabel>
            <Controller control={control} name="signingAlgo"
              render={({ field: { onChange, value, ref } }) => (
                <Tooltip title="May be 'RS256' or 'HS256', with 'RS256' being the default.">
                  <OutlinedInput
                    type="text"
                    id="signing-algo"
                    name="signingAlgo"
                    label="Token signing algorithm"
                    onChange={onChange}
                    value={value}
                    ref={ref}
                  />
                </Tooltip>
              )} />
          </FormControl>
        </Grid>
      </Grid>
      <FormGroup>
        <Grid container spacing={4}>
          <Grid item xs={4}>
            <Controller
              control={control}
              name='selectAccount'
              render={({ field: { onChange, value } }) => (
                <Tooltip title="If checked, user will be permitted to select an account for authentication.">
                  <FormControlLabel
                    control={<Checkbox checked={value} onChange={onChange} />}
                    label='Allow account selection' />
                </Tooltip>
              )}>
            </Controller>
          </Grid>
        </Grid>
      </FormGroup>
    </Stack>
  )
}

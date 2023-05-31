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
  const { register, formState: { errors, touchedFields } } = useFormContext()
  return (
    <Grid container spacing={4}>
      <Grid item xs={12}>
        <FormControl error={errors["issuerUri"] && touchedFields["issuerUri"]} fullWidth>
          <InputLabel htmlFor="issuer-uri">Issuer URI</InputLabel>
          <OutlinedInput
            type="text"
            id="issuer-uri"
            name="issuerUri"
            label="Issuer URI"
            {...register("issuerUri", { pattern: /^https?:\/\/.+/ })}
          />
          <FormHelperText>{
            errors.issuerUri?.type === 'pattern' && 'URL must begin with http:// or https://'
          }</FormHelperText>
        </FormControl>
      </Grid>
      <Grid item xs={6}>
        <FormControl error={errors["clientId"] && touchedFields["clientId"]} fullWidth>
          <InputLabel htmlFor="client-id">Client ID</InputLabel>
          <OutlinedInput
            type="text"
            id="client-id"
            name="clientId"
            label="Client ID"
            {...register("clientId", { required: true })}
          />
          <FormHelperText>{
            errors.clientId?.type === 'required' && 'Must provide an identifier'
          }</FormHelperText>
        </FormControl>
      </Grid>
      <Grid item xs={6}>
        <FormControl error={errors["clientSecret"] && touchedFields["clientSecret"]} fullWidth>
          <InputLabel htmlFor="client-secret">Client Secret</InputLabel>
          <PasswordInput name="clientSecret" label="Client Secret" required={true} register={register} />
          <FormHelperText>{
            errors.clientSecret?.type === 'required' && 'Must provide a secret value'
          }</FormHelperText>
        </FormControl>
      </Grid>
    </Grid>
  )
}

function AdvancedOptions() {
  const { control, register, formState: { errors, touchedFields } } = useFormContext()

  return (
    <Stack spacing={4}>
      <Grid container spacing={4}>
        <Grid item xs={6}>
          <FormControl error={errors["codeChallenge"] && touchedFields["codeChallenge"]} fullWidth>
            <InputLabel htmlFor="code-challenge">Code Challenge Method</InputLabel>
            <OutlinedInput
              type="text"
              id="code-challenge"
              name="codeChallenge"
              label="Code Challenge Method"
              {...register("codeChallenge")}
            />
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <FormControl error={errors["signingAlgo"] && touchedFields["signingAlgo"]} fullWidth>
            <InputLabel htmlFor="signing-algo">Token signing algorithm</InputLabel>
            <OutlinedInput
              type="text"
              id="signing-algo"
              name="signingAlgo"
              label="Token signing algorithm"
              {...register("signingAlgo")}
            />
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
                <FormControlLabel
                  control={<Checkbox checked={value} onChange={onChange} />}
                  label='Allow account selection' />
              )}>
            </Controller>
          </Grid>
        </Grid>
      </FormGroup>
    </Stack>
  )
}

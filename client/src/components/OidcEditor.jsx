//
// Copyright 2023 Perforce Software
//
import React from 'react'
import {
  Controller,
  useFormContext
} from 'react-hook-form'
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
  Tabs,
  Typography
} from '@mui/material'

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Must be contained within a FormProvider component.
export default function OidcEditor() {
  const [selectedTab, setSelectedTab] = React.useState(0)

  const selectTab = (event, newValue) => {
    setSelectedTab(newValue)
  }

  return (
    <Container>
      <Typography variant="h6">
        Enter Details
      </Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={selectedTab} onChange={selectTab}>
          <Tab label="Basic Integration" />
          <Tab label="Advanced Options" />
        </Tabs>
      </Box>
      <TabPanel value={selectedTab} index={0}>
        <BasicOptions />
      </TabPanel>
      <TabPanel value={selectedTab} index={1}>
        <AdvancedOptions />
      </TabPanel>
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
          <OutlinedInput
            type="text"
            id="client-secret"
            name="clientSecret"
            label="Client Secret"
            {...register("clientSecret", { required: true })}
          />
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

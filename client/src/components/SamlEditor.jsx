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

// Must be contained within a FormProvider component.
export default function SamlEditor() {
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
      <Grid item xs={6}>
        <FormControl error={errors["metadataUrl"] && touchedFields["metadataUrl"]} fullWidth>
          <InputLabel htmlFor="metadata-url">Metadata URL</InputLabel>
          <OutlinedInput
            type="text"
            id="metadata-url"
            name="metadataUrl"
            label="Metadata URL"
            {...register("metadataUrl", { pattern: /^https?:\/\/.+/ })}
          />
          <FormHelperText>{
            errors.metadataUrl?.type === 'pattern' && 'URL must begin with http:// or https://'
          }</FormHelperText>
        </FormControl>
      </Grid>
      <Grid item xs={6}>
        <FormControl error={errors["spEntityId"] && touchedFields["spEntityId"]} fullWidth>
          <InputLabel htmlFor="sp-entity-id">SP Entity ID</InputLabel>
          <OutlinedInput
            type="text"
            id="sp-entity-id"
            name="spEntityId"
            label="SP Entity ID"
            {...register("spEntityId")}
          />
          <FormHelperText>{
            errors.spEntityId?.type === 'pattern' && 'URL must begin with http:// or https://'
          }</FormHelperText>
        </FormControl>
      </Grid>
    </Grid>
  )
}

function AdvancedOptions() {
  const { control, register, formState: { errors, touchedFields }, watch } = useFormContext()
  const watchDisableContext = watch('disableContext', false)

  return (
    <Stack spacing={4}>
      <Grid container spacing={4}>
        <Grid item xs={6}>
          <FormControl error={errors["signonUrl"] && touchedFields["signonUrl"]} fullWidth>
            <InputLabel htmlFor="signon-url">Provider SSO URL</InputLabel>
            <OutlinedInput
              type="text"
              id="signon-url"
              name="signonUrl"
              label="Provider SSO URL"
              {...register("signonUrl", { pattern: /^https?:\/\/.+/ })}
            />
            <FormHelperText>{
              errors.signonUrl?.type === 'pattern' && 'URL must begin with http:// or https://'
            }</FormHelperText>
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <FormControl error={errors["idpEntityId"] && touchedFields["idpEntityId"]} fullWidth>
            <InputLabel htmlFor="idp-entity-id">IDP Entity ID</InputLabel>
            <OutlinedInput
              type="text"
              id="idp-entity-id"
              name="idpEntityId"
              label="IDP Entity ID"
              {...register("idpEntityId")}
            />
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <FormControl error={errors["audience"] && touchedFields["audience"]} fullWidth>
            <InputLabel htmlFor="sp-audience">SP Audience</InputLabel>
            <OutlinedInput
              type="text"
              id="sp-audience"
              name="audience"
              label="SP Audience"
              {...register("audience")}
            />
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <FormControl error={errors["nameIdFormat"] && touchedFields["nameIdFormat"]} fullWidth>
            <InputLabel htmlFor="nameid-format">NameID Format</InputLabel>
            <OutlinedInput
              type="text"
              id="nameid-format"
              name="nameIdFormat"
              label="NameID Format"
              {...register("nameIdFormat")}
            />
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <FormControl error={errors["authnContext"] && touchedFields["authnContext"]} fullWidth>
            <InputLabel htmlFor="authn-context">Authentication Context</InputLabel>
            <OutlinedInput
              type="text"
              id="authn-context"
              name="authnContext"
              disabled={watchDisableContext}
              label="Authentication Context"
              {...register("authnContext")}
            />
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <FormControl error={errors["keyAlgorithm"] && touchedFields["keyAlgorithm"]} fullWidth>
            <InputLabel htmlFor="key-algorithm">Key Algorithm</InputLabel>
            <OutlinedInput
              type="text"
              id="key-algorithm"
              name="keyAlgorithm"
              label="Key Algorithm"
              {...register("keyAlgorithm")}
            />
          </FormControl>
        </Grid>
      </Grid>
      <FormGroup>
        <Grid container spacing={4}>
          <Grid item xs={4}>
            <Controller
              control={control}
              name='disableContext'
              render={({ field: { onChange, value } }) => (
                <FormControlLabel
                  control={<Checkbox checked={value} onChange={onChange} />}
                  label='Disable Authentication Context' />
              )}>
            </Controller>
          </Grid>
          <Grid item xs={4}>
            <Controller
              control={control}
              name='wantAssertionSigned'
              render={({ field: { onChange, value } }) => (
                <FormControlLabel
                  control={<Checkbox checked={value} onChange={onChange} />}
                  label='Want assertion signed' />
              )}>
            </Controller>
          </Grid>
          <Grid item xs={4}>
            <Controller
              control={control}
              name='wantResponseSigned'
              render={({ field: { onChange, value } }) => (
                <FormControlLabel
                  control={<Checkbox checked={value} onChange={onChange} />}
                  label='Want response signed' />
              )}>
            </Controller>
          </Grid>
        </Grid>
      </FormGroup>
    </Stack>
  )
}

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
            <Tab label="Metadata & Certs" value="3" />
          </TabList>
        </Box>
        <TabPanel value="1">
          <BasicOptions />
        </TabPanel>
        <TabPanel value="2">
          <AdvancedOptions />
        </TabPanel>
        <TabPanel value="3">
          <MetadataCerts />
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
          <Tooltip title="URL from which metadata for the identity provider may be retrieved.">
            <OutlinedInput
              type="text"
              id="metadata-url"
              name="metadataUrl"
              label="Metadata URL"
              {...register("metadataUrl", { pattern: /^https?:\/\/.+/ })}
            />
          </Tooltip>
          <FormHelperText>{
            errors.metadataUrl?.type === 'pattern' && 'URL must begin with http:// or https://'
          }</FormHelperText>
        </FormControl>
      </Grid>
      <Grid item xs={6}>
        <FormControl error={errors["spEntityId"] && touchedFields["spEntityId"]} fullWidth>
          <InputLabel htmlFor="sp-entity-id">SP Entity ID</InputLabel>
          <Tooltip title="Identifier for this service, default is https://has.example.com">
            <OutlinedInput
              type="text"
              id="sp-entity-id"
              name="spEntityId"
              label="SP Entity ID"
              {...register("spEntityId")}
            />
          </Tooltip>
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
            <Tooltip title="URL of the single sign-on service of the identity provider.">
              <OutlinedInput
                type="text"
                id="signon-url"
                name="signonUrl"
                label="Provider SSO URL"
                {...register("signonUrl", { pattern: /^https?:\/\/.+/ })}
              />
            </Tooltip>
            <FormHelperText>{
              errors.signonUrl?.type === 'pattern' && 'URL must begin with http:// or https://'
            }</FormHelperText>
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <FormControl error={errors["idpEntityId"] && touchedFields["idpEntityId"]} fullWidth>
            <InputLabel htmlFor="idp-entity-id">IDP Entity ID</InputLabel>
            <Tooltip title="Identifier for this identity provider.">
              <OutlinedInput
                type="text"
                id="idp-entity-id"
                name="idpEntityId"
                label="IDP Entity ID"
                {...register("idpEntityId")}
              />
            </Tooltip>
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <FormControl error={errors["audience"] && touchedFields["audience"]} fullWidth>
            <InputLabel htmlFor="sp-audience">SP Audience</InputLabel>
            <Tooltip title="If specified on both the identity provider and here, the service will ensure the SAML response matches this value.">
              <OutlinedInput
                type="text"
                id="sp-audience"
                name="audience"
                label="SP Audience"
                {...register("audience")}
              />
            </Tooltip>
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <FormControl error={errors["nameIdFormat"] && touchedFields["nameIdFormat"]} fullWidth>
            <InputLabel htmlFor="nameid-format">NameID Format</InputLabel>
            <Tooltip title="Typically left blank, but may be used to inform the IdP what type of nameID value to return.">
              <OutlinedInput
                type="text"
                id="nameid-format"
                name="nameIdFormat"
                label="NameID Format"
                {...register("nameIdFormat")}
              />
            </Tooltip>
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <FormControl error={errors["authnContext"] && touchedFields["authnContext"]} fullWidth>
            <InputLabel htmlFor="authn-context">Authentication Context</InputLabel>
            <Tooltip title="May be used to restrict the means by which a user authenticates.">
              <OutlinedInput
                type="text"
                id="authn-context"
                name="authnContext"
                disabled={watchDisableContext}
                label="Authentication Context"
                {...register("authnContext")}
              />
            </Tooltip>
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <FormControl error={errors["keyAlgorithm"] && touchedFields["keyAlgorithm"]} fullWidth>
            <InputLabel htmlFor="key-algorithm">Key Algorithm</InputLabel>
            <Tooltip title="Algorithm for signing requests; defaults to sha256.">
              <OutlinedInput
                type="text"
                id="key-algorithm"
                name="keyAlgorithm"
                label="Key Algorithm"
                {...register("keyAlgorithm")}
              />
            </Tooltip>
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
                <Tooltip title="If checked, does not send any authentication context at all.">
                  <FormControlLabel
                    control={<Checkbox checked={value} onChange={onChange} />}
                    label='Disable Authentication Context' />
                </Tooltip>
              )}>
            </Controller>
          </Grid>
          <Grid item xs={4}>
            <Controller
              control={control}
              name='wantAssertionSigned'
              render={({ field: { onChange, value } }) => (
                <Tooltip title="The SAML assertion must be signed or authentication will fail. Not all identity providers do this by default, or at all.">
                  <FormControlLabel
                    control={<Checkbox checked={value} onChange={onChange} />}
                    label='Want assertion signed' />
                </Tooltip>
              )}>
            </Controller>
          </Grid>
          <Grid item xs={4}>
            <Controller
              control={control}
              name='wantResponseSigned'
              render={({ field: { onChange, value } }) => (
                <Tooltip title="The SAML response must be signed or authentication will fail. Not all identity providers do this by default, or at all.">
                  <FormControlLabel
                    control={<Checkbox checked={value} onChange={onChange} />}
                    label='Want response signed' />
                </Tooltip>
              )}>
            </Controller>
          </Grid>
        </Grid>
      </FormGroup>
    </Stack>
  )
}

function MetadataCerts() {
  const { register, formState: { errors, touchedFields } } = useFormContext()

  return (
    <Stack direction='row' spacing={4}>
      <FormControl error={errors["metadata"] && touchedFields["metadata"]} fullWidth>
        <InputLabel htmlFor="idp-metadata">IdP Metadata</InputLabel>
        <Tooltip title="Raw XML metadata for the SAML identity provider.">
          <OutlinedInput
            type="text"
            id="idp-metadata"
            name="metadata"
            label="IdP Metadata"
            multiline
            rows={12}
            {...register("metadata")}
          />
        </Tooltip>
      </FormControl>
      <FormControl error={errors["idpCert"] && touchedFields["idpCert"]} fullWidth>
        <InputLabel htmlFor="idp-cert">IDP Certificate</InputLabel>
        <Tooltip title="PEM encoded public certificate of the SAML identity provider.">
          <OutlinedInput
            type="text"
            id="idp-cert"
            name="idpCert"
            label="IDP Certificate"
            multiline
            rows={12}
            {...register("idpCert")}
          />
        </Tooltip>
      </FormControl>
    </Stack>
  )
}

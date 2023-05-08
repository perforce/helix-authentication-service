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
export default function SamlEditor() {
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
  const { control, register, formState: { errors, touchedFields } } = useFormContext()

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
          <FormControl error={errors["authnContext"] && touchedFields["authnContext"]} fullWidth>
            <InputLabel htmlFor="authn-context">Authentication Context</InputLabel>
            <OutlinedInput
              type="text"
              id="authn-context"
              name="authnContext"
              label="Authentication Context"
              {...register("authnContext")}
            />
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
      </Grid>
      <FormGroup>
        <Grid container spacing={4}>
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

//
// Copyright 2023 Perforce Software
//
import React from 'react'
import {
  Alert,
  Button,
  Container,
  FormControl,
  FormControlLabel,
  Grid,
  Radio,
  RadioGroup,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography
} from '@mui/material'
import { useForm, FormProvider } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { usePostProviderMutation } from '~/app/services/auth'
import OidcEditor from '~/components/OidcEditor'
import SamlEditor from '~/components/SamlEditor'

const steps = ['Select Identity Provider', 'Select Protocol', 'Enter Details']
const providers = [
  { id: 'okta', label: 'Okta' },
  { id: 'auth0', label: 'Auth0' },
  { id: 'aad', label: 'Azure AD' },
  { id: 'one', label: 'OneLogin' },
  { id: 'goog', label: 'Google Workspace' },
  { id: 'ping', label: 'PingFederate' },
  { id: 'cust', label: 'Custom Identity Provider ' }
]

export default function Wizard() {
  const navigate = useNavigate()
  const [activeStep, setActiveStep] = React.useState(0)
  const [provider, setProvider] = React.useState(null)
  const [protocol, setProtocol] = React.useState('saml')
  const [applyError, setApplyError] = React.useState(null)
  const [postProvider] = usePostProviderMutation()
  const methods = useForm({ mode: 'onBlur', values: {} })

  const onSubmit = (data) => {
    data.protocol = protocol
    postProvider(data).unwrap()
      .then(() => {
        navigate('/')
      })
      .catch((err) => {
        if (err.data) {
          setApplyError(JSON.stringify(err.data))
        } else {
          setApplyError('Oh no, there was an error!')
        }
      })
  }

  const handleCancel = () => {
    navigate('/')
  }

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1)
  }

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1)
  }

  const handleSubmit = (event) => {
    // The form would always auto-submit when reaching the last step, for some
    // unknown reason, but doing it this way prevents that behavior.
    event.preventDefault()
    methods.handleSubmit(onSubmit)()
  }

  const stepContents = () => {
    if (activeStep === 0) {
      return (
        <ProviderChooser onSelect={(value) => setProvider(value)} value={provider} />
      )
    } else if (activeStep === 1) {
      return (
        <ProtocolChooser onSelect={(value) => setProtocol(value)} value={protocol} />
      )
    } else if (activeStep === 2) {
      return (
        <Stack spacing={2}>
          {applyError && <Alert severity='error'>{applyError}</Alert>}
          {protocol === 'saml' ? <SamlEditor /> : <OidcEditor />}
        </Stack>
      )
    }
  }

  return (
    <Container maxWidth='lg' sx={{ my: 2 }}>
      <Stack spacing={2}>
        <Stepper activeStep={activeStep}>
          {steps.map((label, index) => {
            return (
              <Step key={`step-${index}`}>
                <StepLabel>{label}</StepLabel>
              </Step>
            )
          })}
        </Stepper>
        <FormProvider {...methods} >
          <form>
            <Stack spacing={2}>
              {stepContents()}
              <Stack direction="row" spacing={2}>
                <Button
                  onClick={handleCancel}
                  variant={activeStep === 0 ? 'outlined' : 'text'}
                >
                  Cancel
                </Button>
                {activeStep > 0 &&
                  <Button
                    variant='outlined'
                    onClick={handleBack}
                  >
                    Back
                  </Button>
                }
                {
                  activeStep === steps.length - 1 ?
                    <Button onClick={handleSubmit} variant='contained'>Save</Button> :
                    <Button
                      onClick={handleNext}
                      variant='contained'
                      disabled={activeStep === 0 && provider == null}
                    >
                      Next
                    </Button>
                }
              </Stack>
            </Stack>
          </form>
        </FormProvider>
      </Stack>
    </Container>
  )
}

// value will be the provider `id` as defined in the providers list
function ProviderChooser({ onSelect, value }) {
  return (
    <Stack spacing={2}>
      <Typography>
        Select an identity provider
      </Typography>
      <Grid container spacing={2}>
        {providers.map((p) => (
          <Grid item xs={4} key={p.id}>
            <Button
              onClick={() => onSelect(p.id)}
              variant={value === p.id ? 'contained' : 'outlined'}
            >
              {p.label}
            </Button>
          </Grid>
        ))}
      </Grid>
    </Stack>
  )
}

// value will be either 'oidc' or 'saml'
function ProtocolChooser({ onSelect, value }) {
  return (
    <Stack spacing={2}>
      <Typography>
        Choose a security protocol
      </Typography>
      <FormControl>
        <RadioGroup row value={value} onChange={(e) => onSelect(e.target.value)}>
          <FormControlLabel value='oidc' control={<Radio />} label='OIDC' />
          <FormControlLabel value='saml' control={<Radio />} label='SAML' />
        </RadioGroup>
      </FormControl>
    </Stack>
  )
}

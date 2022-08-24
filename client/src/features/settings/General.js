//
// Copyright 2022 Perforce Software
//
import React from 'react'
import { Form, Formik } from 'formik'
import {
  Alert,
  Box,
  Checkbox,
  Container,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Grid,
  Radio,
  RadioGroup,
  Slider,
  Stack,
  Typography,
} from '@mui/material'
import MuiInput from '@mui/material/Input'
import Timelapse from '@mui/icons-material/Timelapse'
import { styled } from '@mui/material/styles'
import { useSelector } from 'react-redux'
import { selectFetched } from 'features/settings/settingsSlice'
import AutoApplyChanges from './AutoApplyChanges'

const deserialize = (incoming) => {
  return {
    loginTimeout: incoming['LOGIN_TIMEOUT'] || '60',
    // checkbox component seems to handle arrays of values with ['on'] meaning
    // checked and [] meaning unchecked
    forceAuthn: incoming['FORCE_AUTHN'] === 'true' ? ['on'] : [],
    defaultProtocol: incoming['DEFAULT_PROTOCOL'] || 'saml'
  }
}

const serialize = (outgoing) => {
  return {
    LOGIN_TIMEOUT: outgoing['loginTimeout'],
    FORCE_AUTHN: outgoing['forceAuthn'].length > 0 ? true : false,
    DEFAULT_PROTOCOL: outgoing['defaultProtocol'],
  }
}

const Input = styled(MuiInput)`
  width: 56px;
`

const maxLoginTimeout = 300

const LoginTimeout = ({ name, handleChange, handleBlur, value: incoming }) => {
  const [value, setValue] = React.useState(Number(incoming || 0))

  const handleSliderChange = (event, newValue) => {
    setValue(newValue)
    handleChange(event)
  }

  const handleInputChange = (event) => {
    const newValue = event.target.value
    setValue(newValue === '' ? 0 : Number(newValue))
    handleChange(event)
  }

  const onBlur = (event) => {
    if (value < 0) {
      setValue(0)
    } else if (value > maxLoginTimeout) {
      setValue(maxLoginTimeout)
    }
    handleBlur(event)
  }

  return (
    <Box sx={{ width: 500 }}>
      <Typography id="input-slider" gutterBottom>
        Login timeout in seconds
      </Typography>
      <Grid container spacing={4} alignItems="center">
        <Grid item>
          <Timelapse />
        </Grid>
        <Grid item xs>
          <Slider
            id={name + '-slider'}
            name={name}
            value={typeof value === 'number' ? value : 0}
            step={10}
            marks
            min={0}
            max={maxLoginTimeout}
            onChange={handleSliderChange}
            aria-labelledby="input-slider"
          />
        </Grid>
        <Grid item>
          <Input
            id={name + '-input'}
            name={name}
            value={value}
            onChange={handleInputChange}
            onBlur={onBlur}
            inputProps={{
              step: 10,
              min: 0,
              max: maxLoginTimeout,
              type: 'number',
              'aria-labelledby': 'input-slider',
            }}
          />
        </Grid>
      </Grid>
    </Box>
  )
}

export const General = () => {
  const fetched = useSelector(selectFetched)

  return fetched ? (
    <Formik
      initialValues={deserialize(fetched)}
      validate={values => {
        const errors = {}
        return errors
      }}
    >
      {(props) => (
        <Form>
          <Container>
            <Stack spacing={2}>
              <FormControl>
                <FormLabel id="protocol-radio-buttons-group">Default authentication protocol</FormLabel>
                <RadioGroup
                  row
                  aria-labelledby="protocol-radio-buttons-group"
                  name="defaultProtocol"
                  value={props.values['defaultProtocol']}
                  onChange={props.handleChange}
                >
                  <FormControlLabel value="saml" control={<Radio />} label="SAML 2.0" />
                  <FormControlLabel value="oidc" control={<Radio />} label="OpenID Connect" />
                </RadioGroup>
              </FormControl>
              <LoginTimeout
                name="loginTimeout"
                handleChange={props.handleChange}
                handleBlur={props.handleBlur}
                value={props.values['loginTimeout']}
              />
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="forceAuthn"
                      onChange={props.handleChange}
                      checked={props.values['forceAuthn'].length > 0}
                    />}
                  label="Force authentication on each login"
                />
              </FormGroup>
            </Stack>
          </Container>
          <AutoApplyChanges serialize={serialize} />
        </Form>
      )}
    </Formik>
  ) : (
    <Alert severity="info">Waiting for settings...</Alert>
  )
}

export default General

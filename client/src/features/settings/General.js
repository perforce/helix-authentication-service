//
// Copyright 2022 Perforce Software
//
import React from 'react'
import {
  Checkbox,
  Container,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material'
import MuiInput from '@mui/material/Input'
import { styled } from '@mui/material/styles'

export const deserialize = (incoming, values) => {
  values['g_loginTimeout'] = incoming['LOGIN_TIMEOUT'] || '60'
  // checkbox component seems to handle arrays of values with ['on'] meaning
  // checked and [] meaning unchecked
  values['g_forceAuthn'] = incoming['FORCE_AUTHN'] === 'true' ? ['on'] : []
  values['g_defaultProtocol'] = incoming['DEFAULT_PROTOCOL'] || 'saml'
}

export const serialize = (values, outgoing) => {
  outgoing['LOGIN_TIMEOUT'] = values['g_loginTimeout']
  outgoing['FORCE_AUTHN'] = values['g_forceAuthn'].length > 0 ? true : false
  outgoing['DEFAULT_PROTOCOL'] = values['g_defaultProtocol']
}

export const validate = (values, errors) => {
  // nothing to validate
}

const Input = styled(MuiInput)`
  width: 64px;
`

export const Component = ({ props }) => {
  return (
    <Container>
      <Stack spacing={2}>
        <Typography variant="h4" sx={{ borderTop: 1, borderColor: 'grey.500' }}>
          General
        </Typography>
        <FormControl>
          <FormLabel id="protocol-label">Default authentication protocol</FormLabel>
          <RadioGroup
            row
            aria-labelledby="protocol-label"
            name="g_defaultProtocol"
            value={props.values['g_defaultProtocol']}
            onChange={props.handleChange}
          >
            <FormControlLabel value="oidc" control={<Radio />} label="OpenID Connect" />
            <FormControlLabel value="saml" control={<Radio />} label="SAML 2.0" />
          </RadioGroup>
        </FormControl>
        <FormControl>
          <FormLabel id="timeout-label">Login timeout in seconds</FormLabel>
          <Input
            name="g_loginTimeout"
            value={props.values['g_loginTimeout']}
            onChange={props.handleChange}
            onBlur={props.handleBlur}
            inputProps={{
              step: 10,
              min: 0,
              max: 300,
              type: 'number',
              'aria-labelledby': 'timeout-label',
            }}
          />
        </FormControl>
        <FormControlLabel
          control={
            <Checkbox
              name="g_forceAuthn"
              onChange={props.handleChange}
              checked={props.values['g_forceAuthn'].length > 0}
            />}
          label="Force authentication on each login"
        />
      </Stack>
    </Container>
  )
}

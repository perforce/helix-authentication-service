//
// Copyright 2023 Perforce Software
//
import React from 'react'
import { Controller, useFormContext } from 'react-hook-form'
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
  values['g_loginTimeout'] = incoming && (incoming['LOGIN_TIMEOUT'] || '60')
  // checkbox component seems to handle arrays of values with ['on'] meaning
  // checked and [] meaning unchecked
  values['g_forceAuthn'] = incoming && incoming['FORCE_AUTHN'] === 'true' ? ['on'] : []
  values['g_defaultProtocol'] = incoming && (incoming['DEFAULT_PROTOCOL'] || 'saml')
}

export const serialize = (values, outgoing) => {
  // only output serialized values if they were modified
  if ('g_loginTimeout' in values) {
    outgoing['LOGIN_TIMEOUT'] = values['g_loginTimeout']
  }
  if ('g_forceAuthn' in values) {
    outgoing['FORCE_AUTHN'] = values['g_forceAuthn'].length > 0 ? true : false
  }
  if ('g_defaultProtocol' in values) {
    outgoing['DEFAULT_PROTOCOL'] = values['g_defaultProtocol']
  }
}

const Input = styled(MuiInput)`
  width: 64px;
`

export const Component = () => {
  const { control, register } = useFormContext()
  return (
    <Container>
      <Stack spacing={2}>
        <Typography variant='h4' sx={{ borderTop: 1, borderColor: 'grey.500' }}>
          General
        </Typography>
        <FormControl>
          <FormLabel id='protocol-label'>Default authentication protocol</FormLabel>
          <Controller
            control={control}
            name='g_defaultProtocol'
            render={({ field: { onChange, value } }) => (
              <RadioGroup
                row
                aria-labelledby='protocol-label'
                value={value}
                onChange={onChange}
              >
                <FormControlLabel value='oidc' control={<Radio />} label='OpenID Connect' />
                <FormControlLabel value='saml' control={<Radio />} label='SAML 2.0' />
              </RadioGroup>
            )}>
          </Controller>
        </FormControl>
        <FormControl>
          <FormLabel id='timeout-label'>Login timeout in seconds</FormLabel>
          <Input
            {...register('g_loginTimeout')}
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
            <Controller
              name='g_forceAuthn'
              control={control}
              render={({ field: props }) => (
                <Checkbox
                  {...props}
                  checked={props.value.length > 0}
                  onChange={(e) => props.onChange(e.target.checked ? ['on'] : [])}
                />
              )}
            />
          }
          label='Force authentication on each login'
        />
      </Stack>
    </Container >
  )
}

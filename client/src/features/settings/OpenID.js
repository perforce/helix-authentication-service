//
// Copyright 2022 Perforce Software
//
import React, { useState } from 'react'
import {
  Container,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Stack,
  Typography,
} from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import TextInputField from './TextInputField'

export const deserialize = (incoming, values) => {
  values['o_issuer'] = incoming['OIDC_ISSUER_URI'] || ''
  values['o_client'] = incoming['OIDC_CLIENT_ID'] || ''
  values['o_secret'] = incoming['OIDC_CLIENT_SECRET'] || ''
}

export const serialize = (values, outgoing) => {
  outgoing['OIDC_ISSUER_URI'] = values['o_issuer']
  outgoing['OIDC_CLIENT_ID'] = values['o_client']
  outgoing['OIDC_CLIENT_SECRET'] = values['o_secret']
}

export const validate = (values, errors) => {
  if (values.issuer && !/^https?:\/\/.+/.test(values.issuer)) {
    errors.issuer = 'Must start with http:// or https://'
  }
}

function SecretInput({ name, value, label, onChange, onBlur }) {
  const [show, setShow] = useState(false)
  const handleClick = () => setShow(!show)
  const handleMouseDown = (event) => event.preventDefault()

  const inputId = name + '-field'
  return (
    <FormControl>
      <InputLabel htmlFor={inputId}>{label}</InputLabel>
      <OutlinedInput
        type={show ? 'text' : 'password'}
        id={inputId}
        name={name}
        value={value}
        label={label}
        onChange={onChange}
        onBlur={onBlur}
        endAdornment={
          <InputAdornment position="end">
            <IconButton
              aria-label="toggle password visibility"
              onClick={handleClick}
              onMouseDown={handleMouseDown}
              edge="end"
            >
              {show ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        }
      />
    </FormControl>
  )
}

export const Component = ({ props }) => {
  return (
    <Container>
      <Stack spacing={2}>
        <Typography variant="h4" sx={{ borderTop: 1, borderColor: 'grey.500' }}>
          OpenID Connect
        </Typography>
        <TextInputField
          name="o_issuer"
          values={props.values}
          errors={props.errors}
          touched={props.touched}
          label="Issuer URI"
          onChange={props.handleChange}
          onBlur={props.handleBlur}
        />
        <TextInputField
          name="o_client"
          values={props.values}
          errors={props.errors}
          touched={props.touched}
          label="Client identifier"
          onChange={props.handleChange}
          onBlur={props.handleBlur}
        />
        <SecretInput
          name="o_secret"
          value={props.values.o_secret}
          label="Client secret"
          onChange={props.handleChange}
          onBlur={props.handleBlur}
        />
      </Stack>
    </Container>
  )
}

//
// Copyright 2023 Perforce Software
//
import React, { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import {
  Container,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Stack,
  Typography,
} from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'

export const deserialize = (incoming, values) => {
  values['o_issuer'] = incoming['OIDC_ISSUER_URI'] || ''
  values['o_client'] = incoming['OIDC_CLIENT_ID'] || ''
  values['o_secret'] = incoming['OIDC_CLIENT_SECRET'] || ''
}

export const serialize = (values, outgoing) => {
  // only output serialized values if they were modified
  if ('o_issuer' in values) {
    outgoing['OIDC_ISSUER_URI'] = values['o_issuer']
  }
  if ('o_client' in values) {
    outgoing['OIDC_CLIENT_ID'] = values['o_client']
  }
  if ('o_secret' in values) {
    outgoing['OIDC_CLIENT_SECRET'] = values['o_secret']
  }
}

function SecretInput({ name, label, register }) {
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
        label={label}
        {...register(name)}
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

export const Component = () => {
  const { register, formState: { errors, touchedFields } } = useFormContext()
  return (
    <Container>
      <Stack spacing={2}>
        <Typography variant="h4" sx={{ borderTop: 1, borderColor: 'grey.500' }}>
          OpenID Connect
        </Typography>
        <FormControl error={errors["o_issuer"] && touchedFields["o_issuer"]}>
          <InputLabel htmlFor="o_issuer-field">Issuer URI</InputLabel>
          <OutlinedInput
            type="text"
            id="o_issuer-field"
            name="o_issuer"
            label="Issuer URI"
            {...register("o_issuer", { pattern: /^https?:\/\/.+/ })}
          />
          <FormHelperText>{
            errors.o_issuer?.type === 'pattern' && 'URL must begin with http:// or https://'
          }</FormHelperText>
        </FormControl>
        <FormControl error={errors["o_client"] && touchedFields["o_client"]}>
          <InputLabel htmlFor="o_client-field">Client identifier</InputLabel>
          <OutlinedInput
            type="text"
            id="o_client-field"
            name="o_client"
            label="Client identifier"
            {...register("o_client")}
          />
        </FormControl>
        <SecretInput
          name="o_secret"
          label="Client secret"
          register={register}
        />
      </Stack>
    </Container>
  )
}

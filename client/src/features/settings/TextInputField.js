//
// Copyright 2022 Perforce Software
//
import React from 'react'
import {
  FormControl,
  FormHelperText,
  InputLabel,
  OutlinedInput,
} from '@mui/material'

export const TextInputField = ({ name, values, errors, touched, label, onChange, onBlur }) => {
  const inputId = name + "-field"
  return (
    <FormControl error={errors[name] && touched[name]}>
      <InputLabel htmlFor={inputId}>{label}</InputLabel>
      <OutlinedInput
        id={inputId}
        onChange={onChange}
        name={name}
        type="text"
        onBlur={onBlur}
        value={values[name]}
        label={label}
      />
      <FormHelperText>{errors[name]}</FormHelperText>
    </FormControl>
  )
}

export default TextInputField

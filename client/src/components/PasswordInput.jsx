//
// Copyright 2023 Perforce Software
//
import React, { useState } from 'react'
import {
  IconButton,
  InputAdornment,
  OutlinedInput,
} from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'

export const PasswordInput = ({ name, label, required, register }) => {
  const [show, setShow] = useState(false)
  const handleClick = () => setShow(!show)
  const handleMouseDown = (event) => event.preventDefault()

  return (
    <OutlinedInput
      type={show ? 'text' : 'password'}
      id={name}
      name={name}
      label={label}
      {...register(name, { required })}
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
  )
}

export default PasswordInput

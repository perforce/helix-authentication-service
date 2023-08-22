//
// Copyright 2023 Perforce Software
//
import React, { useState } from 'react'
import {
  IconButton,
  InputAdornment,
  OutlinedInput,
  Tooltip,
} from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'

export const PasswordInput = ({ name, value, label, onChange, onBlur, forwardedRef, tooltip }) => {
  const [show, setShow] = useState(false)
  const handleClick = () => setShow(!show)
  const handleMouseDown = (event) => event.preventDefault()

  const inner = (
    <OutlinedInput
      type={show ? 'text' : 'password'}
      id={name}
      name={name}
      value={value}
      label={label}
      onChange={onChange}
      onBlur={onBlur}
      ref={forwardedRef}
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
  return tooltip ? <Tooltip title={tooltip}>{inner}</Tooltip> : inner
}

export default PasswordInput

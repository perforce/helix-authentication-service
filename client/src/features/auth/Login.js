//
// Copyright 2022 Perforce Software
//
import React, { useState } from 'react'
import {
  Alert,
  Container,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Stack,
  Typography,
} from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useLoginMutation } from '../../app/services/auth'

function PasswordInput({ name, onChange, }) {
  const [show, setShow] = useState(false)
  const handleClick = () => setShow(!show)
  const handleMouseDown = (event) => event.preventDefault()

  return (
    <OutlinedInput
      type={show ? 'text' : 'password'}
      placeholder="Enter password"
      name={name}
      onChange={onChange}
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

export const Login = () => {
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const [formState, setFormState] = useState({ username: '', password: '' })
  const [login, { isFetching }] = useLoginMutation()

  const handleChange = ({
    target: { name, value },
  }) => setFormState((prev) => ({ ...prev, [name]: value }))

  return (
    <Container>
      <Stack spacing={4}>
        {error && <Alert severity="error">{ error }</Alert>}
        <Typography variant="h3" gutterBottom component="div">
          Enter administrator credentials
        </Typography>
        <OutlinedInput
          onChange={handleChange}
          name="username"
          type="text"
          placeholder="Enter username"
        />
        <PasswordInput onChange={handleChange} name="password" />
        <LoadingButton
          onClick={async () => {
            try {
              await login(formState).unwrap()
              navigate('/')
            } catch (err) {
              setError(err.data || 'Oh no, there was an error!')
            }
          }}
          variant="contained"
          loading={isFetching}
        >
          Login
        </LoadingButton>
      </Stack>
    </Container>
  )
}

export default Login

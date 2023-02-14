//
// Copyright 2023 Perforce Software
//
import React, { useState } from 'react'
import { useForm } from "react-hook-form"
import {
  Alert,
  Container,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Stack,
  Typography,
} from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useLoginMutation } from 'app/services/auth'

function PasswordInput({ register }) {
  const [show, setShow] = useState(false)
  const handleClick = () => setShow(!show)
  const handleMouseDown = (event) => event.preventDefault()

  return (
    <OutlinedInput
      type={show ? 'text' : 'password'}
      placeholder="Enter password"
      {...register("password", { required: true })}
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
  const { register, handleSubmit, formState: { errors, touchedFields } } = useForm({ mode: 'onBlur' })
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const [login, { isLoading }] = useLoginMutation()

  return (
    <form onSubmit={handleSubmit((data) => {
      login(data).unwrap()
        .then(() => {
          navigate('/')
        }).catch((err) => {
          setError(err.data.message || 'Oh no, there was an error!')
        })
    })}>
      <Container maxWidth="sm" sx={{ my: 2 }}>
        <Stack spacing={4}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="h4" component="div">
            Administrator login
          </Typography>
          <FormControl error={errors.username && touchedFields.username}>
            <OutlinedInput
              type="text"
              placeholder="Enter username"
              {...register("username", { required: true })}
            />
            <FormHelperText>{
              errors.username?.type === 'required' && 'Username is required'
            }</FormHelperText>
          </FormControl>
          <FormControl error={errors.password && touchedFields.password}>
            <PasswordInput register={register} />
            <FormHelperText>{
              errors.password?.type === 'required' && 'Password is required'
            }</FormHelperText>
          </FormControl>
          <LoadingButton
            type="submit"
            variant="contained"
            loading={isLoading}
          >
            Login
          </LoadingButton>
        </Stack>
      </Container>
    </form>
  )
}

export default Login

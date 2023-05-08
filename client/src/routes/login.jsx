//
// Copyright 2023 Perforce Software
//
import React, { useState } from 'react'
import { useForm } from "react-hook-form"
import {
  Alert,
  Box,
  Card,
  CardContent,
  Container,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Stack,
  Typography,
} from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useLoginMutation } from '~/app/services/auth'

function PasswordInput({ register }) {
  const [show, setShow] = useState(false)
  const handleClick = () => setShow(!show)
  const handleMouseDown = (event) => event.preventDefault()

  return (
    <OutlinedInput
      type={show ? 'text' : 'password'}
      placeholder="Password"
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
      <Grid container justifyContent="space-around">
        <Grid item xs={4} sx={{ backgroundColor: 'primary.main' }}>
          <Box ml={2} mt={4} padding={2}>
            <Typography variant="h5" component="div" sx={{ color: "#FFFFFF" }}>
              Helix Authentication Service
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={8}>
          <Card variant='outlined' sx={{ margin: '128px', padding: '128px' }}>
            <CardContent>
              <Stack spacing={4}>
                {error && <Alert severity="error">{error}</Alert>}
                <Typography variant="h5" component="div">
                  Log In
                </Typography>
                <Box sx={{ fontWeight: 'regular', fontSize: 'h6.fontSize', fontFamily: 'default' }}>
                  Welcome back!
                </Box>
                <FormControl error={errors.username && touchedFields.username}>
                  <OutlinedInput
                    type="text"
                    placeholder="Username"
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
                <Container>
                  <LoadingButton
                    type="submit"
                    variant="contained"
                    loading={isLoading}
                  >
                    Log in
                  </LoadingButton>
                </Container>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </form>
  )
}

export default Login

//
// Copyright 2024 Perforce Software
//
import React, { useState } from 'react'
import {
  Controller,
  useForm
} from "react-hook-form"
import {
  Alert,
  Box,
  Card,
  CardContent,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  OutlinedInput,
  Stack,
  Typography,
} from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { useNavigate } from 'react-router-dom'
import { useLoginMutation } from '~/app/services/auth'
import PasswordInput from '~/components/PasswordInput'

export const Login = () => {
  const { control, handleSubmit, formState: { errors, touchedFields } } =
    useForm({ defaultValues: { username: '', password: '' }, mode: 'onBlur' })
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const [login, { isLoading }] = useLoginMutation()

  return (
    <Grid container alignItems="stretch" justifyContent="space-around" style={{ height: "100vh" }}>
      <Grid item xs={4} sx={{ backgroundColor: 'primary.main' }}>
        <Box ml={2} mt={4} padding={2}>
          <Stack direction="row" spacing={4}>
            <img src="/admin/images/apps-p4mfa-light.png" alt="logo" width="48" height="48" />
            <Typography variant="h5" component="div" sx={{ color: "#FFFFFF" }}>
              Helix Authentication Service
            </Typography>
          </Stack>
        </Box>
      </Grid>
      <Grid item xs={8}>
        <form onSubmit={handleSubmit((data) => {
          login(data).unwrap()
            .then(() => {
              navigate('/')
            }).catch((err) => {
              setError(err.data.message || 'Oh no, there was an error!')
            })
        })}>
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
                  <InputLabel htmlFor="username">Username</InputLabel>
                  <Controller control={control} name="username" rules={{ required: true }}
                    render={({ field: { onChange, onBlur, value, ref } }) => (
                      <OutlinedInput
                        type="text"
                        id="username"
                        name="username"
                        label="Username"
                        onChange={onChange}
                        onBlur={onBlur}
                        value={value}
                        ref={ref}
                      />
                    )} />
                  <FormHelperText>{
                    errors.username?.type === 'required' && 'Username is required'
                  }</FormHelperText>
                </FormControl>
                <FormControl error={errors.password && touchedFields.password}>
                  <InputLabel htmlFor="password">Password</InputLabel>
                  <Controller control={control} name="password" rules={{ required: true }}
                    render={({ field: { onChange, onBlur, value, ref } }) => (
                      <PasswordInput
                        name="password"
                        label="Password"
                        onChange={onChange}
                        onBlur={onBlur}
                        value={value}
                        forwardedRef={ref}
                      />
                    )} />
                  <FormHelperText>{
                    errors.password?.type === 'required' && 'Password is required'
                  }</FormHelperText>
                </FormControl>
                <Stack direction="row" justifyContent="center">
                  <LoadingButton
                    type="submit"
                    variant="contained"
                    loading={isLoading}
                  >
                    Log in
                  </LoadingButton>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </form>
      </Grid>
    </Grid>
  )
}

export default Login

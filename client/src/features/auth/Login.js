//
// Copyright 2022 Perforce Software
//
import React, { useState } from 'react'
import { Formik } from 'formik'
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

function PasswordInput({ name, value, onChange, onBlur }) {
  const [show, setShow] = useState(false)
  const handleClick = () => setShow(!show)
  const handleMouseDown = (event) => event.preventDefault()

  return (
    <OutlinedInput
      type={show ? 'text' : 'password'}
      placeholder="Enter password"
      name={name}
      value={value}
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
  )
}

export const Login = () => {
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const [login, { isFetching }] = useLoginMutation()

  return (
    <Formik
      initialValues={{ username: '', password: '' }}
      validate={values => {
        const errors = {}
        if (!values.username) {
          errors.username = 'Required'
        } else if (!values.password) {
          errors.password = 'Required'
        }
        return errors
      }}
      onSubmit={(values, { setSubmitting }) => {
        setTimeout(() => {
          login(values).unwrap()
            .then(() => {
              navigate('/')
            })
            .catch((err) => {
              setError(err.data || 'Oh no, there was an error!')
            })
          setSubmitting(false)
        }, 400)
      }}
    >
      {({
        values,
        errors,
        touched,
        handleChange,
        handleBlur,
        handleSubmit,
      }) => (
        <form onSubmit={handleSubmit}>
          <Container>
            <Stack spacing={4}>
              {error && <Alert severity="error">{error}</Alert>}
              <Typography variant="h3" gutterBottom component="div">
                Enter administrator credentials
              </Typography>
              <FormControl error={errors.username && touched.username}>
                <OutlinedInput
                  onChange={handleChange}
                  name="username"
                  type="text"
                  onBlur={handleBlur}
                  value={values.username}
                  placeholder="Enter username"
                />
                <FormHelperText id="component-error-text">{errors.username}</FormHelperText>
              </FormControl>
              <FormControl error={errors.password && touched.password}>
                <PasswordInput
                  onChange={handleChange}
                  onBlur={handleBlur}
                  name="password"
                  value={values.password}
                />
                <FormHelperText id="component-error-text">{errors.password}</FormHelperText>
              </FormControl>
              <LoadingButton
                type="submit"
                variant="contained"
                loading={isFetching}
              >
                Login
              </LoadingButton>
            </Stack>
          </Container>
        </form>
      )}
    </Formik>
  )
}

export default Login

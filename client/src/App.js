//
// Copyright 2022 Perforce Software
//
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import {
  AppBar, Box, Button, IconButton, Toolbar, Typography
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu';
import { useLogoutMutation } from 'app/services/auth'
import { Login } from 'features/auth/Login'
import { AllSettings } from 'features/settings/AllSettings'
import { useAuth } from 'hooks/useAuth'
import { PrivateOutlet } from 'utils/PrivateOutlet'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h1>Something went wrong.</h1>
          <p>Please reload the page and try again.</p>
        </div>
      )
    }
    return this.props.children
  }
}

function ButtonAppBar() {
  const [logout, { isFetching }] = useLogoutMutation()
  const auth = useAuth()

  const handleLogout = (event) => {
    event.preventDefault()
    logout()
  }

  const handleStatus = (event) => {
    event.preventDefault()
    // fetch the login test packet to get the base URL, otherwise the request
    // ends up going to the CRA server
    fetch('/requests/new/test')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to get login URL (status ${response.status})`)
        }
        return response.json()
      })
      .then((data) => {
        window.open(data.baseUrl + '/status', '_blank')
      })
      .catch((err) => {
        console.error(err.message)
      })
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Helix Authentication Service
          </Typography>
          <Button
            color="inherit"
            onClick={handleStatus}
          >Status</Button>
          {auth.token && <Button
            color="inherit"
            disabled={isFetching}
            onClick={handleLogout}
          >Logout</Button>}
        </Toolbar>
      </AppBar>
    </Box>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Box>
        <ButtonAppBar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateOutlet />}>
            <Route index element={<AllSettings />} />
          </Route>
        </Routes>
      </Box>
    </ErrorBoundary>
  )
}

export default App

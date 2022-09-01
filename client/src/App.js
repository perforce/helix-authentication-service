//
// Copyright 2022 Perforce Software
//
import React, { useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import {
  AppBar, Box, IconButton, Menu, MenuItem, Toolbar, Typography
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu';
import { useLogoutMutation } from 'app/services/auth'
import { Login } from 'features/auth/Login'
import { AllSettings } from 'features/settings/AllSettings'
import { ShowAll } from 'features/settings/ShowAll'
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
  const navigate = useNavigate()
  const [logout] = useLogoutMutation()
  const [anchorEl, setAnchorEl] = useState(null)
  const auth = useAuth()
  const isMenuShowing = Boolean(anchorEl)

  const handleShowMenu = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleCloseMenu = () => {
    setAnchorEl(null)
  }

  const handleEditSettings = () => {
    setAnchorEl(null)
    navigate('/')
  }

  const handleShowSettings = () => {
    setAnchorEl(null)
    navigate('/settings')
  }

  const handleLogout = (event) => {
    event.preventDefault()
    setAnchorEl(null)
    logout()
  }

  const handleStatus = (event) => {
    event.preventDefault()
    setAnchorEl(null)
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
            id="hamburger-button"
            aria-controls={isMenuShowing ? 'hamburger-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={isMenuShowing ? 'true' : undefined}
            aria-label="hamburger-menu"
            onClick={handleShowMenu}
            size="large"
            edge="start"
            color="inherit"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Menu
            id="hamburger-menu"
            anchorEl={anchorEl}
            open={isMenuShowing}
            onClose={handleCloseMenu}
            MenuListProps={{
              'aria-labelledby': 'hamburger-button',
            }}
          >
            {auth.token ? <>
              <MenuItem onClick={handleEditSettings}>Edit Settings</MenuItem>
              <MenuItem onClick={handleShowSettings}>View Settings</MenuItem>
              <MenuItem onClick={handleStatus}>Status</MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </> : <>
              <MenuItem onClick={handleStatus}>Status</MenuItem>
            </>}
          </Menu>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Helix Authentication Service
          </Typography>
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
          <Route path="/settings" element={<PrivateOutlet />}>
            <Route index element={<ShowAll />} />
          </Route>
          <Route path="/" element={<PrivateOutlet />}>
            <Route index element={<AllSettings />} />
          </Route>
          <Route path="*" element={<p>Page not found</p>} />
        </Routes>
      </Box>
    </ErrorBoundary>
  )
}

export default App

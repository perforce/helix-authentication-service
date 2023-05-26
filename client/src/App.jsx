//
// Copyright 2023 Perforce Software
//
import React, { useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import {
  AppBar, Box, IconButton, Menu, MenuItem, Toolbar, Typography
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu';
import { useLogoutMutation } from '~/app/services/auth'
import { Login } from '~/features/auth/Login'
import { AllSettings } from '~/features/settings/AllSettings'
import { ShowAll } from '~/features/settings/ShowAll'
import { useAuth } from '~/hooks/useAuth'
import { PrivateOutlet } from '~/utils/PrivateOutlet'

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

  const handleOpenDocs = () => {
    setAnchorEl(null)
    window.open('https://www.perforce.com/manuals/helix-auth-svc/Content/HAS/configuring-has.html', '_blank')
  }

  const handleTestLogin = () => {
    setAnchorEl(null)
    fetch('/requests/new/test')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to get login URL (status ${response.status})`)
        }
        return response.json()
      })
      .then((response) => {
        window.open(response.loginTestUrl, '_blank')
      })
      .catch((err) => {
        console.error(err.message)
      })
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
    // ends up going to the frontend server
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

  // An elaborate method for dynamically building the menu while also avoiding
  // the "Menu component doesn't accept a Fragment as a child" error.
  const menuItems = auth.token ? [
    { onClick: handleOpenDocs, label: 'Documentation' },
    { onClick: handleTestLogin, label: 'Test Login' },
    { onClick: handleEditSettings, label: 'Edit Settings' },
    { onClick: handleShowSettings, label: 'View Settings' },
    { onClick: handleStatus, label: 'Status' },
    { onClick: handleLogout, label: 'Logout' }
  ] : [
    { onClick: handleStatus, label: 'Status' }
  ]
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
            {menuItems.map((mi) => ([<MenuItem onClick={mi.onClick}>{mi.label}</MenuItem>]))}
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
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/settings" element={<PrivateOutlet />}>
            <Route index element={<ShowAll />} />
          </Route>
          <Route path="/saml" element={<PrivateOutlet />}>
            <Route path="/:id" lazy={() => import("~/features/settings/SamlEditor")} />
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
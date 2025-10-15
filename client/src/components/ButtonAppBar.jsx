//
// Copyright 2023 Perforce Software
//
import React from 'react'
import {
  AppBar,
  Box,
  Button,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout';
import { useLogoutMutation } from '~/app/services/auth'

export const ButtonAppBar = () => {
  const [logout] = useLogoutMutation()

  const handleOpenDocs = () => {
    window.open(
      'https://www.perforce.com/manuals/helix-auth-svc/Content/HAS/configuring-has.html',
      '_blank'
    )
  }

  const handleLogout = (event) => {
    event.preventDefault()
    logout()
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <img src="/admin/images/apps-p4mfa-dark.png" alt="logo" height="24" width="24" />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, mx: 2 }}>
            P4 Authentication Service
          </Typography>
          <Button onClick={handleOpenDocs} variant='text' color="inherit">
            Documentation
          </Button>
          <Tooltip title="Log out">
            <IconButton onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
    </Box>
  );
}

export default ButtonAppBar

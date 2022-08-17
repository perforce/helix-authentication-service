//
// Copyright 2022 Perforce Software
//
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Box } from '@mui/material'
import { Login } from './features/auth/Login'
import { PrivateOutlet } from './utils/PrivateOutlet'
import { ShowSettings } from './features/auth/ShowSettings'

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

function App() {
  return (
    <ErrorBoundary>
      <Box>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateOutlet />}>
            <Route index element={<ShowSettings />} />
          </Route>
        </Routes>
      </Box>
    </ErrorBoundary>
  )
}

export default App

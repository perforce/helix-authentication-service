//
// Copyright 2022 Perforce Software
//
import { Routes, Route } from 'react-router-dom'
import { Box } from '@mui/material'
import { Login } from './features/auth/Login'
import { PrivateOutlet } from './utils/PrivateOutlet'
import { ShowSettings } from './features/auth/ShowSettings'

function App() {
  return (
    <Box>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateOutlet />}>
          <Route index element={<ShowSettings />} />
        </Route>
      </Routes>
    </Box>
  )
}

export default App

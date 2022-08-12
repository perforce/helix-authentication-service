//
// Copyright 2022 Perforce Software
//
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function PrivateOutlet() {
  const auth = useAuth()
  const location = useLocation()

  return auth.token ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ from: location }} />
  )
}

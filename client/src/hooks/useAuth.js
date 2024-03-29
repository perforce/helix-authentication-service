//
// Copyright 2022 Perforce Software
//
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { selectCurrentToken } from '~/app/reducers/authSlice'

export const useAuth = () => {
  const token = useSelector(selectCurrentToken)
  return useMemo(() => ({ token }), [token])
}

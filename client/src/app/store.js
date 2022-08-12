//
// Copyright 2022 Perforce Software
//
import { configureStore } from '@reduxjs/toolkit'
import { auth } from './services/auth'
import authReducer from '../features/auth/authSlice'

export const store = configureStore({
  reducer: {
    [auth.reducerPath]: auth.reducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(auth.middleware),
})

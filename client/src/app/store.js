//
// Copyright 2022 Perforce Software
//
import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit'
import { auth } from './services/auth'
import authReducer from './reducers/authSlice'
import settingsReducer from './reducers/settingsSlice'

const persistMiddleware = createListenerMiddleware()

persistMiddleware.startListening({
  predicate: (action, currentState, originalState) => {
    if (currentState && originalState) {
      if (currentState.auth.token !== originalState.auth.token) {
        return true
      }
    }
    return false
  },
  effect: async (action, listenerApi) => {
    const state = listenerApi.getState()
    if (state.auth.token) {
      sessionStorage.setItem('token', JSON.stringify(state.auth.token))
    } else {
      sessionStorage.removeItem('token')
    }
  },
})

function loadTokenFromStorage() {
  try {
    const serializedToken = sessionStorage.getItem('token')
    if (serializedToken === null) {
      return null
    }
    return JSON.parse(serializedToken)
  } catch (err) {
    return null
  }
}

export const store = configureStore({
  preloadedState: {
    auth: {
      token: loadTokenFromStorage()
    }
  },
  reducer: {
    [auth.reducerPath]: auth.reducer,
    auth: authReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(auth.middleware).concat(persistMiddleware.middleware),
})

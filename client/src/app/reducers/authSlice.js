//
// Copyright 2022 Perforce Software
//
import { createSlice } from '@reduxjs/toolkit'
import { auth } from '~/app/services/auth'

const slice = createSlice({
  name: 'auth',
  initialState: { token: null },
  reducers: {},
  extraReducers: (builder) => {
    // n.b. calls to builder.addCase() come first
    builder.addMatcher(
      auth.endpoints.login.matchFulfilled,
      (state, { payload }) => {
        state.token = payload
      }
    )
    builder.addMatcher(
      auth.endpoints.logout.matchFulfilled,
      (state) => {
        state.token = null
      }
    )
    builder.addMatcher(
      (action) => action.type.endsWith('/rejected'),
      (state, { payload }) => {
        // If a 401 response is received, invalidate the token
        if (payload && payload.status === 401) {
          state.token = null
        }
      }
    )
    // n.b. calls to builder.addDefaultCase() come last
  },
})

export default slice.reducer

export const selectCurrentToken = (state) => state.auth.token

//
// Copyright 2022 Perforce Software
//
import { createSlice } from '@reduxjs/toolkit'
import { auth } from '../../app/services/auth'

const slice = createSlice({
  name: 'auth',
  initialState: { token: null },
  // reducers: {
  //   setCredentials: (
  //     state,
  //     { payload: { user, token } }
  //   ) => {
  //     state.user = user
  //     state.token = token
  //   },
  // },
  reducers: {},
  extraReducers: (builder) => {
    builder.addMatcher(
      auth.endpoints.login.matchFulfilled,
      (state, { payload }) => {
        state.token = payload
      }
    )
  },
})

// export const { setCredentials } = slice.actions

export default slice.reducer

export const selectCurrentToken = (state) => state.auth.token

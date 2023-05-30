//
// Copyright 2023 Perforce Software
//
import { createSlice } from '@reduxjs/toolkit'
import { auth } from '~/app/services/auth'

const slice = createSlice({
  name: 'settings',
  initialState: {
    fetched: null,
    modified: null
  },
  reducers: {
    applyChanges(state, action) {
      state.modified = Object.assign({}, state.modified, action.payload)
    },
    discardChanges(state, action) {
      state.modified = null
    },
  },
  extraReducers: (builder) => {
    // n.b. calls to builder.addCase() come first
    builder.addMatcher(
      auth.endpoints.getSettings.matchFulfilled,
      (state, { payload }) => {
        state.fetched = payload
      }
    )
    builder.addMatcher(
      auth.endpoints.putProvider.matchFulfilled,
      (state, { payload }) => {
        state.modified = null
      }
    )
    // n.b. calls to builder.addDefaultCase() come last
  },
})

export const { applyChanges, discardChanges } = slice.actions

export default slice.reducer

export const selectFetched = (state) => state.settings.fetched
export const selectModified = (state) => state.settings.modified

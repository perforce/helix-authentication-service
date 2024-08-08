//
// Copyright 2024 Perforce Software
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
    // eslint-disable-next-line no-unused-vars
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
      // eslint-disable-next-line no-unused-vars
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

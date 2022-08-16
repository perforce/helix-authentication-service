//
// Copyright 2022 Perforce Software
//
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const auth = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: '/',
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token
      if (token && token.access_token) {
        headers.set('Authorization', `Bearer ${token.access_token}`)
      }
      return headers
    },
  }),
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: 'tokens',
        method: 'POST',
        body: { ...credentials, grant_type: 'password' },
      }),
    }),
    getSettings: builder.query({
      query: () => 'settings',
    }),
  }),
})

export const { useLoginMutation, useGetSettingsQuery } = auth

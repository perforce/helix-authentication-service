//
// Copyright 2022 Perforce Software
//
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

//
// REST API endpoints for interacting with access-controlled content, which
// starts with acquiring a bearer token, and includes handling the case of the
// token expiring while accessing protected endpoints.
//
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
    logout: builder.mutation({
      query: () => ({
        url: 'tokens',
        method: 'DELETE',
      }),
    }),
    getSettings: builder.query({
      query: () => 'settings',
    }),
    sendChanges: builder.mutation({
      // perform both the update and apply as a single redux action
      async queryFn(arg, queryApi, extraOptions, baseQuery) {
        const update = await baseQuery({
          url: 'settings',
          method: 'POST',
          body: arg
        })
        if (update.error) {
          return { error: update.error }
        }
        const apply = await baseQuery({
          url: 'settings/apply',
          method: 'POST'
        })
        return apply.data ? { data: apply.data } : { error: apply.error }
      },      
    }),
  }),
})

export const {
  useLoginMutation,
  useLogoutMutation,
  useGetSettingsQuery,
  useSendChangesMutation,
} = auth

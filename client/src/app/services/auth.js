//
// Copyright 2023 Perforce Software
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
  tagTypes: ['Providers', 'Status'],
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
    getStatus: builder.query({
      query: () => 'status',
      providesTags: ['Status'],
    }),
    getAllProviders: builder.query({
      query: () => `settings/providers`,
      providesTags: ['Providers'],
    }),
    getOneProvider: builder.query({
      query: (providerId) => `settings/providers/${providerId}`,
    }),
    postProvider: builder.mutation({
      // perform both the addition and apply as a single redux action
      async queryFn(arg, queryApi, extraOptions, baseQuery) {
        const update = await baseQuery({
          url: 'settings/providers',
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
        return apply
      },
      invalidatesTags: ['Providers', 'Status'],
    }),
    putProvider: builder.mutation({
      // perform both the update and apply as a single redux action
      async queryFn(arg, queryApi, extraOptions, baseQuery) {
        const update = await baseQuery({
          url: `settings/providers/${arg.id}`,
          method: 'PUT',
          body: arg
        })
        if (update.error) {
          return { error: update.error }
        }
        const apply = await baseQuery({
          url: 'settings/apply',
          method: 'POST'
        })
        return apply
      },
      invalidatesTags: ['Providers', 'Status'],
    }),
    deleteProvider: builder.mutation({
      // perform both the delete and apply as a single redux action
      async queryFn(arg, queryApi, extraOptions, baseQuery) {
        const update = await baseQuery({
          url: `settings/providers/${arg}`,
          method: 'DELETE'
        })
        if (update.error) {
          return { error: update.error }
        }
        const apply = await baseQuery({
          url: 'settings/apply',
          method: 'POST'
        })
        return apply
      },
      invalidatesTags: ['Providers'],
    }),
  }),
})

export const {
  useLoginMutation,
  useLogoutMutation,
  useGetAllProvidersQuery,
  useGetOneProviderQuery,
  useGetSettingsQuery,
  useGetStatusQuery,
  usePostProviderMutation,
  usePutProviderMutation,
  useDeleteProviderMutation,
} = auth

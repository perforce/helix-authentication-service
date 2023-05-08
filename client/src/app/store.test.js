//
// Copyright 2022 Perforce Software
//
import fetchMock from 'jest-fetch-mock'
import { store } from './store'
import { auth } from './services/auth'
import { applyChanges } from './reducers/settingsSlice'

beforeEach(() => {
  fetchMock.resetMocks()
})

describe('auth redux state tests', () => {
  it('should initially set token to null', () => {
    expect(store).toBeDefined()
    const state = store.getState().auth
    expect(state.token).toEqual(null)
  })

  it('should store retrieved bearer token', async () => {
    fetchMock.mockResponse(JSON.stringify({
      'token_type': 'bearer',
      'access_token': 'honest.bearer.token',
      'expires_in': 3600
    }))
    store.dispatch(auth.endpoints.login.initiate({
      username: 'timbo', password: 'highscore'
    })).then(() => {
      expect(fetchMock).toBeCalledTimes(1)
      const request = fetchMock.mock.calls[0][0]
      const authorization = request.headers.get('Authorization')
      expect(request.method).toBe('POST')
      expect(request.url).toBe(`/tokens`)
      expect(authorization).toBeNull()
      request.json().then((data) => {
        expect(data).toEqual({
          grant_type: 'password',
          username: 'timbo',
          password: 'highscore'
        })
      })
      const state = store.getState().auth
      expect(state.token).toEqual({
        'token_type': 'bearer',
        'access_token': 'honest.bearer.token',
        'expires_in': 3600
      })
    })
  })

  it('should store retrieved settings', async () => {
    fetchMock.mockResponse(JSON.stringify({
      'setting1': 'value1',
      'setting2': 'value2'
    }))
    store.dispatch(auth.endpoints.getSettings.initiate()).then(() => {
      expect(fetchMock).toBeCalledTimes(1)
      const request = fetchMock.mock.calls[0][0]
      const authorization = request.headers.get('Authorization')
      expect(request.method).toBe('GET')
      expect(request.url).toBe(`/settings`)
      expect(authorization).toEqual('Bearer honest.bearer.token')
      const state = store.getState().settings
      expect(state.fetched).toEqual({
        'setting1': 'value1',
        'setting2': 'value2'
      })
    })
  })

  it('should send settings changes', async () => {
    // apply changes now to verify that the modified values are cleared after
    // sending changes to the backend
    store.dispatch(applyChanges({ setting1: 'newvalue' }))
    fetchMock.mockResponse(JSON.stringify({ status: 'ok' }))
    store.dispatch(auth.endpoints.putProvider.initiate({
      setting3: 'value3', setting4: 'value4'
    })).then(() => {
      expect(fetchMock).toBeCalledTimes(2)
      const request1 = fetchMock.mock.calls[0][0]
      const authorization1 = request1.headers.get('Authorization')
      expect(request1.method).toBe('PUT')
      expect(request1.url).toBe(`/settings/provider/foo`)
      expect(authorization1).toEqual('Bearer honest.bearer.token')
      request1.json().then((data) => {
        expect(data).toEqual({ setting3: 'value3', setting4: 'value4' })
      })
      const request2 = fetchMock.mock.calls[1][0]
      const authorization2 = request2.headers.get('Authorization')
      expect(request2.method).toBe('POST')
      expect(request2.url).toBe(`/settings/apply`)
      expect(authorization2).toEqual('Bearer honest.bearer.token')
      const state = store.getState().settings
      expect(state.modified).toBeNull()
    })
  })
})

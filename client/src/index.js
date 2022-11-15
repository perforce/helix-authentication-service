//
// Copyright 2022 Perforce Software
//
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import App from './App'
import { store } from './app/store'

const container = document.getElementById('root')
const root = ReactDOM.createRoot(container)

// Make sure basename in BrowserRouter matches `homepage` in package.json,
// otherwise the router cannot match the location with components.
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter basename="/admin">
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
)

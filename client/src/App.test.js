//
// Copyright 2022 Perforce Software
//
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './app/store'
import App from './App'

test('renders administrative login prompt', () => {
  render(<Provider store={store}><BrowserRouter><App /></BrowserRouter></Provider>)
  const linkElement = screen.getByText(/Administrator login/i)
  expect(linkElement).toBeInTheDocument()
})

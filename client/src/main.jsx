//
// Copyright 2023 Perforce Software
//
import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  Alert,
  Container,
  Paper,
  Typography
} from '@mui/material'
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
  useRouteError,
} from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from '~/app/store'
import { useAuth } from '~/hooks/useAuth'
import Editor, { loader as editLoader } from '~/routes/edit'
import Login from '~/routes/login'
import Wizard from '~/routes/new'
import Root from '~/routes/root'

function ErrorPage() {
  const error = useRouteError()
  console.error(error)

  return (
    <Container>
      <div id="error-page">
        <Alert severity='error'>Sorry, an unexpected error has occurred.</Alert>
        <Paper>
          <Typography variant="h6" gutterBottom>
            Error details are shown below:
          </Typography>
          <pre>{error.statusText || error.message}</pre>
        </Paper>
      </div>
    </Container>
  )
}

export default function PrivateOutlet() {
  const auth = useAuth()
  const location = useLocation()

  return auth.token ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ from: location }} />
  )
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <PrivateOutlet />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Root />,
      },
      {
        path: '/new',
        element: <Wizard />
      },
      {
        path: '/oidc/:id',
        loader: editLoader,
        element: <Editor protocol='oidc' />
      },
      {
        path: '/saml/:id',
        loader: editLoader,
        element: <Editor protocol='saml' />
      }
    ],
  }
], { basename: '/admin' })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>
)

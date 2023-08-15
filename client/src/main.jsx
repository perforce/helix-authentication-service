//
// Copyright 2023 Perforce Software
//
import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  Alert,
  Button,
  Snackbar,
  Stack,
  Typography
} from '@mui/material'
import { orange } from '@mui/material/colors'
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
  useNavigate,
  useRouteError,
} from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from '~/app/store'
import ButtonAppBar from '~/components/ButtonAppBar'
import { useAuth } from '~/hooks/useAuth'
import Editor, { loader as editLoader } from '~/routes/edit'
import Login from '~/routes/login'
import Wizard from '~/routes/new'
import Root from '~/routes/root'

async function copyTextToClipboard(text) {
  if ('clipboard' in navigator) {
    return await navigator.clipboard.writeText(text)
  } else {
    return document.execCommand('copy', true, text)
  }
}

function ErrorPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [showSnackbar, setShowSnackbar] = React.useState(false)
  const error = useRouteError()
  const errorText = error.statusText || error.message
  console.error(error)

  const handleGoBack = () => {
    if (location.pathname === '/') {
      // Refresh the page since simply navigating to "/" does not have the
      // desired effect when we are already at that location.
      navigate(0)
    } else {
      navigate('/')
    }
  }

  const handleCopyClick = () => {
    copyTextToClipboard(errorText).catch((err) => {
      console.error(err)
    })
    setShowSnackbar(true)
  }

  const handleClose = () => {
    setShowSnackbar(false)
  }

  return (
    <div id="error-page">
      <Stack alignItems="center" justifyContent="center" style={{ height: "66vh" }} spacing={2}>
        <WarningRoundedIcon fontSize="large" sx={{ color: orange['900'] }} />
        <Typography variant="h6" align="center" gutterBottom sx={{ color: orange['900'] }}>
          Sorry, an unexpected error has occurred.
        </Typography>
        <Typography width="50%">{errorText}</Typography>
        <Stack direction="row" spacing={4}>
          <Button variant="outlined" onClick={handleGoBack}>Go Back</Button>
          <Button startIcon={<ContentCopyIcon />} variant="contained" onClick={handleCopyClick}>Copy Error</Button>
        </Stack>
      </Stack>
      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        open={showSnackbar}
        autoHideDuration={3000}
        onClose={handleClose}
      >
        <Alert onClose={handleClose} severity="success" sx={{ width: '100%' }}>
          Error Copied!
        </Alert>
      </Snackbar>
    </div>
  )
}

export default function PrivateOutlet() {
  const auth = useAuth()
  const location = useLocation()

  return auth.token ? (
    <Stack>
      <ButtonAppBar />
      <Outlet />
    </Stack>
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

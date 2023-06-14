//
// Copyright 2023 Perforce Software
//
import React from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DeleteIcon from '@mui/icons-material/Delete'
import DownloadIcon from '@mui/icons-material/Download'
import EditIcon from '@mui/icons-material/Edit'
import HelpCenterIcon from '@mui/icons-material/HelpCenter';
import LockIcon from '@mui/icons-material/Lock'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import WarningIcon from '@mui/icons-material/Warning'
import { useNavigate } from 'react-router-dom'
import { useGetStatusQuery } from '~/app/services/auth'
import { green, red, yellow } from '@mui/material/colors'

function SettingsDialog(props) {
  const { onClose, text, open } = props
  const [isCopied, setIsCopied] = React.useState(false)

  const handleClose = () => {
    onClose()
  }

  async function copyTextToClipboard(text) {
    if ('clipboard' in navigator) {
      return await navigator.clipboard.writeText(text)
    } else {
      return document.execCommand('copy', true, text)
    }
  }

  const handleCopyClick = () => {
    copyTextToClipboard(text).then(() => {
      setIsCopied(true)
      setTimeout(() => {
        setIsCopied(false)
      }, 1500)
    }).catch((err) => {
      console.log(err)
    })
  }

  return (
    <Dialog onClose={handleClose} open={open}>
      <DialogTitle>Provider settings</DialogTitle>
      <DialogContent>
        <Box sx={{ m: 2 }}>
          <Paper sx={{ minWidth: 600, minHeight: 300 }}>
            <pre>
              {text}
            </pre>
          </Paper>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleCopyClick}>
          {isCopied ? 'Copied!' : 'Copy'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const ActionsButton = ({ provider, onDelete }) => {
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [anchorEl, setAnchorEl] = React.useState(null)
  const open = Boolean(anchorEl)
  const editUrl = `/${provider.protocol}/${provider.id}`
  const providerJson = JSON.stringify(provider, null, '  ')

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
  }

  const handleDelete = () => {
    onDelete(provider.id)
    setAnchorEl(null)
  }

  const handleTestLogin = () => {
    setAnchorEl(null)
    fetch(`/requests/new/test?providerId=${provider.id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to get login URL (status ${response.status})`)
        }
        return response.json()
      })
      .then((response) => {
        window.open(response.loginTestUrl, '_blank')
      })
      .catch((err) => {
        console.error(err.message)
      })
  }

  return (
    <React.Fragment>
      <Tooltip title="Actions">
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{ ml: 2 }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        id="account-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              mt: 1.5,
              '& .MuiAvatar-root': {
                width: 32,
                height: 32,
                ml: -0.5,
                mr: 1,
              },
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleTestLogin}>
          <ListItemIcon>
            <PlayArrowIcon fontSize="small" />
          </ListItemIcon>
          Test Integration
        </MenuItem>
        <MenuItem onClick={() => navigate(editUrl)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit
        </MenuItem>
        <MenuItem onClick={() => {
          setDialogOpen(true)
          handleClose()
        }}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          Show settings
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>
      <SettingsDialog
        text={providerJson}
        open={dialogOpen}
        onClose={handleDialogClose}
      />
    </React.Fragment>
  )
}

const OidcProviderDetails = ({ provider }) => {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2">
        Issuer URI:
      </Typography>
      <Typography>
        {provider.issuerUri}
      </Typography>
    </Box>
  )
}

const SamlProviderDetails = ({ provider }) => {
  if (provider.metadataUrl) {
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2">
          Metadata URL:
        </Typography>
        <Typography>
          {provider.metadataUrl}
        </Typography>
      </Box>
    )
  } else {
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2">
          Label:
        </Typography>
        <Typography>
          {provider.label}
        </Typography>
      </Box>
    )
  }
}

const providers = [
  { pattern: '.okta.com', icon: 'okta-logo.svg', width: 64, heigth: 64 },
  { pattern: '.auth0.com', icon: 'auth0-logo.svg', width: 96, heigth: 96 },
  { pattern: '.microsoftonline.com', icon: 'azure-logo.svg', width: 48, heigth: 48 },
  { pattern: '.onelogin.com', icon: 'onelogin-logo.svg', width: 96, heigth: 96 },
  { pattern: '.google.com', icon: 'google-logo.svg', width: 48, heigth: 48 }
]

function makeProviderIcon(provider) {
  let query
  if (provider.issuerUri) {
    query = provider.issuerUri
  } else if (provider.metadataUrl) {
    query = provider.metadataUrl
  } else if (provider.label) {
    query = provider.label
  } else {
    return (
      <LockIcon sx={{ fontSize: 64 }} />
    )
  }
  for (const entry of providers) {
    if (query.includes(entry.pattern)) {
      return (
        <img src={`/images/${entry.icon}`} alt="logo" width={entry.width} height={entry.height} />
      )
    }
  }
  return (
    <LockIcon sx={{ fontSize: 64 }} />
  )
}

function makeStatusIcon(provider, status) {
  // would have used colors "success" and "warning" but they don't look
  // exactly like the colors in the proposed design
  if (status === 'ok') {
    return (
      <Tooltip title="Status: ok">
        <CheckCircleIcon fontSize="small" sx={{ color: green['400'] }} />
      </Tooltip>
    )
  } else if (provider.metadataUrl) {
    return (
      <Tooltip title={`Status: ${status}`}>
        <WarningIcon fontSize="small" sx={{ color: red['900'] }} />
      </Tooltip>
    )
  } else {
    return (
      <Tooltip title={'Status: unknown'}>
        <HelpCenterIcon fontSize="small" sx={{ color: yellow['600'] }} />
      </Tooltip>
    )
  }
}

const ProviderCard = ({ provider, onDelete, status }) => {
  const detailsComponent = provider.protocol === 'oidc' ?
    OidcProviderDetails({ provider, onDelete }) :
    SamlProviderDetails({ provider, onDelete })
  // would have used colors "success" and "warning" but they don't look
  // exactly like the colors in the proposed design
  const statusComponent = makeStatusIcon(provider, status)
  return (
    <Card sx={{
      minWidth: 275, height: "100%", display: "flex", flexDirection: "column"
    }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between">
          <Box sx={{ mb: 4 }}>
            {makeProviderIcon(provider)}
          </Box>
          {statusComponent}
        </Stack>
        {detailsComponent}
        <Typography variant="subtitle2">
          Protocol:
        </Typography>
        <Typography variant="body2">
          {provider.protocol.toUpperCase()}
        </Typography>
      </CardContent>
      <CardActions disableSpacing sx={{
        mt: "auto", display: "flex", justifyContent: "flex-end"
      }}>
        <ActionsButton provider={provider} onDelete={onDelete} />
      </CardActions>
    </Card>
  )
}

export default function Providers({ providers, onDelete }) {
  const { data, error, isLoading } = useGetStatusQuery()
  if (isLoading) {
    return (
      <Alert severity='info'>Checking status of providers...</Alert>
    )
  } else if (error) {
    return (
      <Alert severity='error'>{JSON.stringify(error)}</Alert>
    )
  } else {
    return (
      <Box>
        <Typography>
          Authentication Integrations
        </Typography>
        <Grid container spacing={2}>
          {providers.map((p) => (
            <Grid item xs={4} key={p.id}>
              <ProviderCard provider={p} onDelete={onDelete} status={data[p.protocol][p.id]} />
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }
}

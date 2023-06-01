//
// Copyright 2023 Perforce Software
//
import React from 'react'
import {
  Alert,
  Box,
  Card,
  CardActions,
  CardContent,
  Grid,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import WarningIcon from '@mui/icons-material/Warning';
import { useNavigate } from 'react-router-dom'
import { useGetStatusQuery } from '~/app/services/auth'
import { green, red } from '@mui/material/colors';

const ActionsButton = ({ provider, onDelete }) => {
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = React.useState(null)
  const open = Boolean(anchorEl)
  const editUrl = `/${provider.protocol}/${provider.id}`

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
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
        PaperProps={{
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
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          Download settings file
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>
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
}

const ProviderCard = ({ provider, onDelete, status }) => {
  const detailsComponent = provider.protocol === 'oidc' ?
    OidcProviderDetails({ provider, onDelete }) :
    SamlProviderDetails({ provider, onDelete })
  // would have used colors "success" and "warning" but they don't look
  // exactly like the colors in the proposed design
  const statusComponent = status === 'ok' ? (
    <Tooltip title="Status: ok">
      <CheckCircleIcon fontSize="small" sx={{ color: green['400'] }} />
    </Tooltip>
  ) : (
    <Tooltip title={`Status: ${status}`}>
      <WarningIcon fontSize="small" sx={{ color: red['900'] }} />
    </Tooltip>
  )
  return (
    <Card sx={{
      minWidth: 275, height: "100%", display: "flex", flexDirection: "column"
    }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between">
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            {provider.label}
          </Typography>
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
      <Alert severity='info'>Fetching provider status...</Alert>
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

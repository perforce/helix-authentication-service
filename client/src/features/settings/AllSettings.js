//
// Copyright 2022 Perforce Software
//
import React, { useState } from 'react'
import { Alert, Box, Button, Stack, Tab } from '@mui/material'
import { LoadingButton, TabContext, TabList, TabPanel } from '@mui/lab'
import { useSelector } from 'react-redux'
import { General } from './General'
import { OpenID } from './OpenID'
import { SAML } from './SAML'
import { useGetSettingsQuery, useSendChangesMutation } from 'app/services/auth'
import { selectModified } from 'features/settings/settingsSlice'

export const AllSettings = () => {
  const { data, error } = useGetSettingsQuery()
  const [applyStatus, setApplyStatus] = useState(null)
  const [applyError, setApplyError] = useState(null)
  const [sendChanges, { isFetching }] = useSendChangesMutation()
  const [selectedTab, setSelectedTab] = React.useState('general')
  const modified = useSelector(selectModified)

  const handleChange = (event, newValue) => {
    setSelectedTab(newValue)
  }

  const submitChanges = (event) => {
    event.preventDefault()
    setTimeout(() => {
      if (modified) {
        sendChanges(modified).unwrap()
          .then(() => setApplyStatus('Settings updated successfully'))
          .catch((err) => setApplyError(err.data || 'Oh no, there was an error!'))
      }
    }, 100)
  }

  const openLoginPage = (event) => {
    event.preventDefault()
    fetch('/requests/new/test')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to get login URL (status ${response.status})`)
        }
        return response.json()
      })
      .then((response) => {
        window.open(response.loginUrl, '_blank')
      })
      .catch((err) => {
        setApplyError(err.message)
      })
  }

  return data ? (
    <div>
      {applyError && <Alert severity="error">{applyError}</Alert>}
      {
        applyStatus &&
        <Alert severity="info" onClose={
          () => setApplyStatus(null)
        }>{applyStatus}</Alert>
      }
      <Box sx={{ width: '100%', typography: 'body1' }}>
        <TabContext value={selectedTab}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <TabList onChange={handleChange} aria-label="settings tabs">
              <Tab label="General" value="general" />
              <Tab label="OpenID" value="openid" />
              <Tab label="SAML" value="saml" />
            </TabList>
          </Box>
          <TabPanel value="general"><General /></TabPanel>
          <TabPanel value="openid"><OpenID /></TabPanel>
          <TabPanel value="saml"><SAML /></TabPanel>
        </TabContext>
      </Box>
      <Stack direction="row" spacing={2}>
        <LoadingButton
          onClick={submitChanges}
          type="submit"
          variant="contained"
          disabled={modified === null || Object.entries(modified).length === 0}
          loading={isFetching}
        >
          Apply Changes
        </LoadingButton>
        <Button
          onClick={openLoginPage}
          variant="outlined"
          disabled={modified !== null && Object.entries(modified).length > 0}
        >
          Test login
        </Button>
      </Stack>
    </div>
  ) : error ? (
    <Alert severity="error">{error}</Alert>
  ) : (
    <Alert severity="info">Fetching settings...</Alert>
  )
}

export default AllSettings

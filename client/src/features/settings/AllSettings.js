//
// Copyright 2022 Perforce Software
//
import React, { useState } from 'react'
import { Alert, Box, Tab } from '@mui/material'
import { LoadingButton, TabContext, TabList, TabPanel } from '@mui/lab'
import { useSelector } from 'react-redux'
import { OpenID } from './OpenID'
import { SAML } from './SAML'
import { useGetSettingsQuery, useSendChangesMutation } from 'app/services/auth'
import { selectModified } from 'features/settings/settingsSlice'

export const AllSettings = () => {
  const { data, error } = useGetSettingsQuery()
  const [applyStatus, setApplyStatus] = useState(null)
  const [applyError, setApplyError] = useState(null)
  const [sendChanges, { isFetching }] = useSendChangesMutation()
  const [selectedTab, setSelectedTab] = React.useState('saml')
  const modified = useSelector(selectModified)

  const handleChange = (event, newValue) => {
    setSelectedTab(newValue)
  }

  const handleClick = (event) => {
    event.preventDefault()
    setTimeout(() => {
      sendChanges(modified).unwrap()
        .then(() => setApplyStatus('Settings updated successfully'))
        .catch((err) => setApplyError(err.data || 'Oh no, there was an error!'))
    }, 100)
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
            <TabList onChange={handleChange} aria-label="auth protocol tabs">
              <Tab label="OpenID" value="openid" />
              <Tab label="SAML" value="saml" />
            </TabList>
          </Box>
          <TabPanel value="openid"><OpenID /></TabPanel>
          <TabPanel value="saml"><SAML /></TabPanel>
        </TabContext>
      </Box>
      <LoadingButton
        onClick={handleClick}
        type="submit"
        variant="contained"
        loading={isFetching}
      >
        Apply Changes
      </LoadingButton>
    </div>
  ) : error ? (
    <Alert severity="error">{error}</Alert>
  ) : (
    <Alert severity="info">Fetching settings...</Alert>
  )
}

export default AllSettings

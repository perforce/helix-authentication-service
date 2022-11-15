//
// Copyright 2022 Perforce Software
//
import React from 'react'
import { useFormikContext } from 'formik'
import { useDispatch } from 'react-redux'
import { applyChanges } from 'features/settings/settingsSlice'

//
// Automatically apply valid form data to the redux store.
//
export const AutoApplyChanges = ({ serialize }) => {
  const dispatch = useDispatch()
  const { dirty, isValid, values } = useFormikContext()
  React.useEffect(() => {
    if (dirty && isValid) {
      dispatch(applyChanges(serialize(values)))
    }
  }, [dispatch, dirty, isValid, serialize, values])
  return null
}

export default AutoApplyChanges

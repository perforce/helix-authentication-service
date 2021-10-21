//
// Copyright 2021 Perforce Software
//

//
// Defines the interface for retrieving application settings.
//
class SettingsRepository {
  // Return the value of the named setting, possibly undefined.
  //
  // eslint-disable-next-line no-unused-vars
  get (name) {
    throw new Error('not implemented')
  }
}

export { SettingsRepository }

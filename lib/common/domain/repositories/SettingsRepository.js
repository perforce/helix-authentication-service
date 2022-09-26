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

  // Return the boolean value of the named setting, default is false.
  //
  // eslint-disable-next-line no-unused-vars
  getBool (name) {
    throw new Error('not implemented')
  }

  // Return true if the settings repository contains the named setting.
  //
  // eslint-disable-next-line no-unused-vars
  has (name) {
    throw new Error('not implemented')
  }

  // Set the value for the named setting.
  //
  // eslint-disable-next-line no-unused-vars
  set (name, value) {
    throw new Error('not implemented')
  }
}

export { SettingsRepository }

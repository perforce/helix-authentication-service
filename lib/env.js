//
// Copyright 2020-2021 Perforce Software
//
import dotenv from 'dotenv'

// Importing this module before other application modules will ensure that the
// environment is properly prepared, despite using the early-binding import. The
// unit tests will effectively "override" this module by loading a similar
// module _before_ this module is imported by the application modules.

dotenv.config()

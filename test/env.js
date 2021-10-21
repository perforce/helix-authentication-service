//
// Copyright 2020-2021 Perforce Software
//
import dotenv from 'dotenv'

// Importing this module before other application modules will ensure that the
// environment is properly prepared, despite using the early-binding import.

// Override any existing .env file by loading our test configuration.
dotenv.config({ path: 'test/dot.env' })

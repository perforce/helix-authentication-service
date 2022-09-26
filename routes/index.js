//
// Copyright 2019-2022 Perforce Software
//
import express from 'express'
const router = express.Router()

// eslint-disable-next-line no-unused-vars
router.get('/', (req, res, next) => {
  res.render('index')
})

export default router

const cfg = require('../configuration/index.js')
const express = require('express')
const path = require('path')
const debug = cfg.env == 'development' ? true : false

let router = express.Router()

router.use(express.json())
router.use('/token', require('./token'))

//Default to no matching endpoint
router.use((req, res, next) => {
    res.status(404)
    res.json({ error: 'No matching api endpoint' })
})

module.exports = router
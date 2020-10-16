const cfg = require('../../configuration/index.js')
const express = require('express')
const path = require('path')
const debug = cfg.env == 'development' ? true : false

let api = express.Router()

api.use(express.json())
api.use('*/view/assets', express.static(path.join(__dirname, '../../views/' + '/assets')))
api.use('/token*', require('./token'))
api.use('/find*', require('./find'))
api.use('/get/shops*', require('./shop'))
//api.use('/get/products*', require('./product'))
//Default to no matching endpoint
api.use((req, res, next) => {
    res.status(404)
    res.json({
        error: {
            message: 'Not Found',
            reason: 'no matching api endpoint'
        },
        status: 404
    })
})

module.exports = api

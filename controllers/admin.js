const cfg = require('../configuration')
const validator = require('../utilities/validator')
const converter = require('../utilities/converter')
const media = require('../adapters/storage/media')
const user = require('../models/user')
const express = require('express')
const debug = cfg.env == 'development' ? true : false

let admin = express.Router()

admin.get('/', async (req, res) => {
    try {
        let viewData = {}
        viewData.user = req.user
        viewData.pane = 'whs'
        res.render('admin', viewData)

    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Error retrieving data' }, name: '', user: req.user })
    }
})

admin.post('/', async (req, res) => {
    try {
        let form = converter.objectFieldsToString(req.body)
        if (debug) console.log(form)

        let viewData = {}
        viewData.user = req.user
        viewData.messages = { info: 'Feature not implemented' }
        res.status(501)
        res.render('admin', viewData)
    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Error retrieving data' }, name: '', user: req.user })
    }
})

module.exports = admin
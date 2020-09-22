const cfg = require('../../../configuration')
const express = require('express')
const validator = require('../../../utilities/validator')
const converter = require('../../../utilities/converter')
const handler = require('../../handlers/user/bag')
const debug = cfg.env == 'development' ? true : false

let checkout = express.Router()

checkout.get('/', async (req, res) => {
    try {
        let viewData = await handler.populateViewData(req.user,req.session ? req.session.bag : null)
        viewData.user = req.user
        viewData.messages = {info: 'Feature not implemented.'}
        res.status(501)
        res.render('shopping_bag', viewData)
    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Error retrieving data' }, name: '', user: req.user })
    }
})

checkout.post('/', async (req, res) => {
    try {
        let form = converter.objectFieldsToString(req.body)
        if (debug) console.log(form)

        let viewData = await handler.populateViewData(req.user, req.session ? req.session.bag : null)
        viewData.user = req.user
        viewData.messages = { info: 'Feature not implemented' }
        res.status(501)
        res.render('shopping_bag', viewData)
    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Error retrieving data' }, name: '', user: req.user })
    }

})

module.exports = checkout

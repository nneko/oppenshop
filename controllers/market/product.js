const cfg = require('../../configuration')
const express = require('express')
const validator = require('../../utilities/validator')
const converter = require('../../utilities/converter')
const handler = require('../handlers/market/product')
const debug = cfg.env == 'development' ? true : false

let marketProduct = express.Router()

marketProduct.get('/', async (req, res) => {
    try {
        let qd = req.query
        let viewData = await handler.populateViewData(qd.p)
        viewData.user = req.user
        res.render('product', viewData)

    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Error retrieving data' }, name: '', user: req.user })
    }
})

marketProduct.post('/', async (req, res) => {
    try {
        let form = converter.objectFieldsToString(req.body)
        if (validator.isNotNull(form)) {
            let viewData = await handler.populateViewData(form.pid)
            viewData.user = req.user
            viewData.messages = {info: 'Feature not implemented'}
            res.status(501)
            res.render('product', viewData)
        } else {
            res.status(400)
            res.redirect('/market')
        }
    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Error retrieving data' }, name: '', user: req.user })
    }

})

module.exports = marketProduct

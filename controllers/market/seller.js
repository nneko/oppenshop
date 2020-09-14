const cfg = require('../../configuration')
const express = require('express')
const validator = require('../../utilities/validator')
const handler = require('../handlers/market/seller')
const debug = cfg.env == 'development' ? true : false

let seller = express.Router()

seller.get('/', async (req, res) => {
    try {
        let qd = req.query
        let viewData = await handler.populateViewData(qd.s)
        viewData.user = req.user
        res.render('seller', viewData)

    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Error retrieving data' }, name: '', user: req.user })
    }
})

module.exports = seller

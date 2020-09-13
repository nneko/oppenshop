const cfg = require('../configuration/index.js')
const express = require('express')
const validator = require('../utilities/validator')
const handler = require('./handlers/market')
const debug = cfg.env == 'development' ? true : false

let market = express.Router()

market.use('/page/:page', async function (req, res, next) {
    try {

        if (validator.hasActiveSession(req)) {
            let page = req.params.page || 1
            let qd = req.query
            console.log(page)
            console.log(qd)
            let viewData = {}
            console.log('Page: ' + page)
            viewData = await handler.populateViewData(req.user.id.toString(), product_page = parseInt(page))
            viewData.user = req.user
            res.render('market', viewData)
        } else {
            messages = { error: "You need to be signed in." }
            res.status(403)
            res.render('signin', { messages: messages })
        }
    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Error retrieving shop pagination data' }, name: '', user: req.user })

    }
})

market.get('/', async (req, res) => {
    try {
        let viewData = await handler.populateViewData(validator.isNotNull(req.user) ? req.user.id : null)
        viewData.user = req.user
        res.render('market', viewData)

    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Error retrieving data' }, name: '', user: req.user })
    }
})

module.exports = market

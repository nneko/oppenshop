const cfg = require('../../configuration')
const express = require('express')
const validator = require('../../utilities/validator')
const handler = require('../handlers/market/seller')
const marketHandler = require('../handlers/market/shops')
const debug = cfg.env == 'development' ? true : false

let seller = express.Router()

seller.get('/:shop/page/:page', displayView)
seller.get('/:shop', displayView)
seller.get('/page/:page', displayView)
seller.get('/', displayView)

async function displayView(req, res) {
    try {
        let qd = req.query
        let shopId = req.params.shop || qd.s
        let page = req.params.page || 1
        if (debug) {
            console.log(req.path)
            console.log('Shop id: ' + shopId)
            console.log('Request parameters : ')
            console.log(req.params)
            console.log('Request querystring: ')
            console.log(req.query)
        }
        let viewData = await handler.populateViewData(validator.isNotNull(shopId) ? shopId : null, product_page = parseInt(page))
        viewData.user = req.user
        res.render('seller', viewData)

    } catch (e) {
        if (e && e.name == 'ShopRetrievalError') {
            if(debug) console.error (e)
            res.status(404)
            let viewData = await marketHandler.populateViewData()
            viewData.user = req.user
            viewData.messages = { info: 'Shop not found.' }
            res.render('shops', viewData)
        } else {
            console.error(e)
            res.status(500)
            res.render('error', { error: { status: 500, message: 'Error retrieving seller data' }, name: '', user: req.user })
        }
    }
}

module.exports = seller

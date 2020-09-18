const cfg = require('../../configuration')
const express = require('express')
const validator = require('../../utilities/validator')
const converter = require('../../utilities/converter')
const handler = require('../handlers/market/product')
const product = require('../../models/product')
const ShoppingBag = require('../../models/shoppingbag')
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
            let p = await product.read(form.pid,{findBy: 'id'})
            let bag = new ShoppingBag(req.session.bag)
            bag.add(p,Number(form.quantity))
            if(debug) console.log(bag)
            req.session.bag = bag
            let viewData = await handler.populateViewData(form.pid)
            viewData.user = req.user
            viewData.messages = {success: 'Product added to shopping bag.'}
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

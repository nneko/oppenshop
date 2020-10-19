const cfg = require('../../configuration')
const express = require('express')
const validator = require('../../utilities/validator')
const converter = require('../../utilities/converter')
const handler = require('../handlers/market/product')
const user = require('../../models/user')
const product = require('../../models/product')
const currency = require('../../models/currency')
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

            let bagCurrency = await currency.read({ code: cfg.base_currency_code }, { limit: 1 })

            if (!currency.isValid(bagCurrency)) {
                let currencyError = new Error('Unable to set shopping bag currency')
                throw currencyError
            }
            let bag = new ShoppingBag(req.session.bag,bagCurrency)
            let viewData = await handler.populateViewData(form.pid)
            viewData.user = req.user
            switch(form.action) {
                case 'add_to_bag':
                    await bag.add(p, Number(form.quantity))
                    if (req.user) {
                        let u = await user.read(req.user.id, { findBy: 'id' })
                        await bag.save(u)
                    }
                    if (debug) console.log(bag)
                    req.session.bag = bag
                    viewData.messages = { success: 'Product added to shopping bag.' }
                    break
                case 'remove':
                    bag.remove(p, Number(form.quantity))
                    if (req.user) {
                        let u = await user.read(req.user.id, { findBy: 'id' })
                        await bag.save(u)
                    }
                    if (debug) console.log(bag)
                    req.session.bag = bag
                    viewData.messages = { success: 'Product removed from shopping bag.' }
                    break
                default:
                    viewData.messages = { info: 'Unsupported operation.' }
                    res.status(400)
                    break

            }
            res.locals.bag = bag
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

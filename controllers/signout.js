const cfg = require('../configuration/index.js')
const session = require('express-session')
const express = require('express')
const currency = require('../models/currency')
const ShoppingBag = require('../models/shoppingbag')

let signout = express.Router()

signout.get('/', async (req, res) => {
    if(req.session) {
        try {
            let bagCurrency = await currency.read({ code: cfg.base_currency_code }, { limit: 1 })

            if (!currency.isValid(bagCurrency)) {
                let currencyError = new Error('Unable to set base currency')
                throw currencyError
            }

            req.session.bag = new ShoppingBag(null,bagCurrency)
            res.locals.bag = req.session.bag
        } catch (e) {
            console.log(e)
            if (debug && e.stack) {
                console.error(e.stack)
            }
            throw e
        }
    }
    req.logout()
    res.render('signin',{messages: {success: 'You have been signed out.'}})
})

module.exports = signout

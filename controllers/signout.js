const cfg = require('../configuration/index.js')
const session = require('express-session')
const express = require('express')
const ShoppingBag = require('../models/shoppingbag')

let signout = express.Router()

signout.get('/', (req, res) => {
    req.logout()
    if(req.session) {
        req.session.bag = new ShoppingBag()
        res.locals.bag = req.session.bag
    }
    res.render('signin',{messages: {success: 'You have been signed out.'}})
})

module.exports = signout

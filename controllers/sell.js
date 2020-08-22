const cfg = require('../configuration/index.js')
const express = require('express')
const validator = require('../utilities/validator')
const user = require('../models/user')

let sell = express.Router()

sell.get('/', (req, res) => {
    if(validator.isNotNull(req.user)){
        let properties = {user: req.user }
        res.render('sell',properties)
    } else {
        res.render('become_seller')
    }
})

module.exports = sell
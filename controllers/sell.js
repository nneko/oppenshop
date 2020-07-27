const cfg = require('../configuration/index.js')
const express = require('express')
const validator = require('../utilities/validator')
const user = require('../models/user')

let sell = express.Router()

let viewProperties = {
    title: cfg.title,
    theme: cfg.template
}

sell.get('/', (req, res) => {
    if(validator.isNotNull(req.user)){
        properties = { title: viewProperties.title, theme: viewProperties.theme, user: req.user }
        res.render('sell',properties)
    } else {
        res.render('become_seller', viewProperties)
    }
})

module.exports = sell
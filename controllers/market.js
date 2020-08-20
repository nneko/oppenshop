const cfg = require('../configuration/index.js')
const express = require('express')

let market = express.Router()

market.get('/', (req, res) => {
    res.render('market', { user: req.user })
})

module.exports = market

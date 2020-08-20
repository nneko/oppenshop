const cfg = require('../configuration/index.js')
const express = require('express')

let market = express.Router()

market.get('/', (req, res) => {
    res.render('market', { user: req.user })
})

market.post('/', (req, res) => {
    res.render('market', { user: req.user, messages: {info: 'No matching products found.'} })
})

module.exports = market

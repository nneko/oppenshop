const cfg = require('../configuration/index.js')
const express = require('express')

let market = express.Router()

let props = {
    title: cfg.title,
    theme: cfg.template
}

market.get('/', (req, res) => {
    res.render('market', props)
})

module.exports = market

const cfg = require('../configuration/index.js')
const express = require('express')

let signout = express.Router()

let props = {
    title: cfg.title,
    theme: cfg.template
}

signout.get('/', (req, res) => {
    req.logout()
    res.render('signin', props)
})

module.exports = signout

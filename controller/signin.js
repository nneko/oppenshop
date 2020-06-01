const cfg = require('../configure.js')
const express = require('express')

let signin = express.Router()

let props = {
    title: cfg.title,
    theme: cfg.template
}

signin.get('/', (req, res) => {
    res.render('signin', props)
})

signin.post('/', (req,res) => {
    res.redirect('/')
})

module.exports = signin
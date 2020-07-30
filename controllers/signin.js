const cfg = require('../configuration/index.js')
const express = require('express')
const passport = require('passport')
const validator = require('../utilities/validator.js')

let signin = express.Router()

let props = {
    title: cfg.title,
    theme: cfg.template
}

signin.get('/', (req, res) => {
    if(validator.hasActiveSession(req)){
        res.redirect('/')
    } else {
        res.render('signin', props)
    }
})

signin.post('/', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/signin',
    failureFlash: true
}))

module.exports = signin
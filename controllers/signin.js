const cfg = require('../configuration/index.js')
const express = require('express')
const passport = require('passport')
const validator = require('../utilities/validator.js')

let signin = express.Router()

signin.get('/', (req, res) => {
    if(validator.hasActiveSession(req)){
        res.redirect('/user/account')
    } else {
        res.render('signin')
    }
})

signin.post('/', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/signin',
    failureFlash: true
}))

module.exports = signin
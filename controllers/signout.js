const cfg = require('../configuration/index.js')
const session = require('express-session')
const express = require('express')

let signout = express.Router()

signout.get('/', (req, res) => {
    req.logout()
    if(req.session) {
        delete req.session.bag
    }
    res.render('signin',{messages: {success: 'You have been signed out.'}})
})

module.exports = signout

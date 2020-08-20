const cfg = require('../configuration/index.js')
const express = require('express')

let signout = express.Router()

signout.get('/', (req, res) => {
    req.logout()
    res.render('signin',{messages: {success: 'You have been signed out.'}})
})

module.exports = signout

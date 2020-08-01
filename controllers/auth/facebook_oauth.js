const express = require('express')
const passport = require('passport')

let facebook_oauth = express.Router()

facebook_oauth.get('/', passport.authenticate('facebook',{ scope: ['email'] }))
facebook_oauth.get('/signin',
    passport.authenticate('facebook', {
        successRedirect: '/',
        failureRedirect: '/signin',
        failureFlash: true,
        session: true 
    })
)/*,
    function (req, res) {
        req.session.context = { title: props.title, theme: props.theme, name: req.user.name.givenName, user: req.user }
        res.redirect('/')
    })*/

module.exports = facebook_oauth

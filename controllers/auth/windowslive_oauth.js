const express = require('express')
const passport = require('passport')

let windowslive_oauth = express.Router()

windowslive_oauth.get('/', passport.authenticate('windowslive', { scope: ['wl.signin', 'wl.basic', 'wl.emails'] }))
windowslive_oauth.get('/signin',
    passport.authenticate('windowslive', {
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

module.exports = windowslive_oauth

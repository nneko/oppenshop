const express = require('express')
const passport = require('passport')

let google_oauth = express.Router()

google_oauth.get('/', passport.authenticate('google', { scope: ['profile email'] }))

google_oauth.get('/signin',
    passport.authenticate('google', {
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

module.exports = google_oauth
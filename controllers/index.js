const cfg = require('../configuration/index.js')
const express = require('express')
const path = require('path')
const api = require('../api')
const validator = require('../utilities/validator')
const email_sender = require('../adapters/messaging/mailer.js')
const passport = require('passport')
let router = express.Router()

let props = {
    title: cfg.title,
    theme: cfg.template
}

//routes
router.use('/api', api)
router.use('/public', express.static(path.join(__dirname, '../views/public')))
router.use('/view/assets', express.static(path.join(__dirname, '../views/' + cfg.template + '/assets')))
router.use('/user/view/assets', express.static(path.join(__dirname, '../views/' + cfg.template + '/assets')))
router.use('/signin', require('./signin'))
router.use('/signup', require('./signup'))
router.use('/signout', require('./signout'))
router.use('/verify', require('./verify'))
router.use('/sell', require('./sell'))
router.use('/user/account', require('./user/account'))
router.use('/user/resetpassword', require('./user/resetpassword'))
router.use('/reset', require('./reset'))
router.get('/auth/google', passport.authenticate('google', { scope: ['profile email'] }))
//router.get('/auth/google/callback', require('./google'))
router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/signin', session: true }),
  function(req, res) {
      req.session.context = {title: props.title, theme: props.theme, name: req.user.name.givenName, user: req.user}
      res.redirect('/')
  })


router.get('/', (req, res) => {
    let name = undefined
    let user = undefined
    if(validator.isNotNull(req.user)) {
	user = req.user
        if(validator.isNotNull(req.user.name)) {
            name = req.user.name.givenName
        }
    }
    res.render('index', {title: props.title, theme: props.theme, name: name, user: user})
})

//Default to 404 handler
router.use((req, res, next) => {
    res.status(404)
    
    let status = 404
    let message = 'Not Found'
    
    // respond with html page
    if (req.accepts('html')) {
        let name = undefined
        let user = undefined
    	if(validator.isNotNull(req.user)) {
            user = req.user
            if(validator.isNotNull(req.user.name)) {
                name = req.user.name.givenName
            }
    	}
        res.render('error', { error: { status: status, message: message }, template_errorpage: 'error', name: name, user: user })
        return
    }

    // respond with json
    if (req.accepts('json')) {
        res.json({ error: { status: status, message: message } })
        return
    }

    // default to plain-text. send()
    res.type('txt').send(message)
})

module.exports = router

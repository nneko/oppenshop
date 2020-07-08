const cfg = require('../configure.js')
const express = require('express')
const path = require('path')
const api = require('../api')
const validator = require('../utility/validator')

let router = express.Router()

let props = {
    title: cfg.title,
    theme: cfg.template
}

router.use('/api', api)
router.use('/public', express.static(path.join(__dirname, '../view/public')))
router.use('/view/asset', express.static(path.join(__dirname, '../view/' + cfg.template + '/asset')))

router.use('/signin', require('./signin'))
router.use('/signup', require('./signup'))
router.use('/signout', require('./signout'))
router.use('/account', require('./account'))

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
        res.render('error', { error: { status: status, message: message }, template_errorpage: 'error' })
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

const cfg = require('../configure.js')
const express = require('express')
const path = require('path')
const debug = cfg.env == 'development' ? true : false

let router = express.Router()

let props = {
    title: cfg.title,
    theme: cfg.template
}

router.use('/public', express.static(path.join(__dirname, '../view/public')))
router.use('/view/asset', express.static(path.join(__dirname, '../view/' + cfg.template + '/asset')))

router.use('/signin', require('./signin'))
router.use('/signup', require('./signup'))

router.get('/', (req, res) => {
    res.render('index', {title: props.title, theme: props.theme, name: typeof(req.user) !== 'undefined' && typeof(req.user.name) !== 'undefined' ? req.user.name.givenName : undefined})
})

//Default to 404 handler
router.use((req, res, next) => {
    res.status(404)
    
    let status = 404
    let message = 'Not Found'

    // respond with html page
    if (req.accepts('html')) {
        res.render('error', { error: { status: status, message: message } })
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
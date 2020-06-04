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
    if(debug) console.log(req.user)
    res.render('index', {title: props.title, theme: props.theme, name: typeof(req.user) !== 'undefined' && typeof(req.user.givenName) !== 'undefined' ? req.user.givenName : undefined})
})

module.exports = router
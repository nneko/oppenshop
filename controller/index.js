const cfg = require('../configure.js')
const express = require('express')
const path = require('path')

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
    res.render('index', props)
})

module.exports = router
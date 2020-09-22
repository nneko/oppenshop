const cfg = require('../configuration/index.js')
const express = require('express')
const path = require('path')
const api = require('../api')
const validator = require('../utilities/validator')
const userModel = require('../models/user')
const ShoppingBag = require('../models/shoppingbag')
const user = require('../models/user')
const debug = cfg.env == 'development' ? true : false
let router = express.Router()

//routes

//Create shopping bag
router.use(async (req,res,next) => {
    try {
        if (req.session) {
            if (req.user) {
                let u = await user.read(req.user.id, { findBy: 'id' })
                if (await user.isValid(u) && u.bag) {
                    req.session.bag = new ShoppingBag(u.bag)
                } else {
                    req.session.bag = new ShoppingBag()
                }
            } else {
                if(!req.session.bag) {
                    req.session.bag = new ShoppingBag()
                }
            }
        }
    } catch (e) {
        if(debug) {
            if(e) {
                console.error(e.stack)
                throw e
            }
        }
    }

    next()
})

//APIs
router.use('/api', api)

//Static Files
router.use('/public', express.static(path.join(__dirname, '../views/public')))
router.use('*/view/assets', express.static(path.join(__dirname, '../views/' + '/assets')))

//controllers
router.use('/market', require('./market'))
router.use('/signin', require('./signin'))
router.use('/signup', require('./signup'))
router.use('/signout', require('./signout'))
router.use('/verify', require('./verify'))
router.use('/sell', require('./sell'))
router.use('/checkout', require('./user/bag/checkout'))
router.use('/user/bag', require('./user/bag'))
router.use('/user/shop', require('./user/shop'))
router.use('/user/bag/checkout', require('./user/bag/checkout'))
//router.use('/product/edit', require('./user/producteditor'))
//router.use('/product/edit/*', require('./user/producteditor'))
router.use('/user/account', require('./user/account'))
router.use('/user/resetpassword', require('./user/resetpassword'))
router.use('/reset', require('./reset'))
router.use('/auth/google', require('./auth/google_oauth'))
router.use('/auth/windowslive', require('./auth/windowslive_oauth'))
router.use('/auth/facebook', require('./auth/facebook_oauth'))

//root
router.get('/', async (req, res) => {
    let name = undefined
    let user = undefined
    if(validator.hasActiveSession(req)) {
        try {
            user = req.user
            if(validator.isNotNull(req.user.name)) {
                name = req.user.name.givenName
            }

            //Verification checks
            let verificationRequired = validator.isNotNull(cfg.verifyUsers) ? cfg.verifyUsers : false;
            const u = await userModel.read(user.id, {findBy: 'id'})

            let isVerified = u && u.verified

            if (verificationRequired && (!isVerified)) {
                console.log(user)
                console.log(isVerified)
                req.logout()
                res.render('verify', { name: undefined, user: undefined, messages: {error: 'Account verification is required.'} })
                return
            } else {
                res.redirect('/market')
            }
        } catch (e) {
            console.error(e)
            res.render('error', { name: name, user: user, messages: {error: 'Error validating session.', status: 500} })

        }
    }
    else {
        res.redirect('/market')
    }
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
    	if(validator.hasActiveSession(req)) {
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

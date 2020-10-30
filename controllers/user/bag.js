const cfg = require('../../configuration')
const validator = require('../../utilities/validator')
const converter = require('../../utilities/converter')
const handler = require('../handlers/user/bag')
const express = require('express')
const debug = cfg.env == 'development' ? true : false

let bag = express.Router()

bag.get('/', async (req, res) => {
    try {
        let viewData = await handler.populateViewData(validator.isNotNull(req.user) ? req.user.id : null, validator.isNotNull(req.session) ? req.session.bag : null)
        viewData.user = req.user
        viewData.csrfToken = req.csrfToken()
        res.render('shopping_bag', viewData)

    } catch (e) {
        console.log(e)
        if(debug) {
            if (e.stack) console.error(e.stack)
        }
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Error retrieving data' }, name: '', user: req.user})
    }
})

bag.post('/', async (req, res) => {
    try {
        let form = converter.objectFieldsToString(req.body)
        if (validator.isNotNull(form)) {
            switch (form.action) {
                case 'delete_from_bag':
                    try {
                        let bag = await handler.deleteItem(req.user ? req.user.id : null,form.pid,req.session.bag)
                        let viewData = await handler.populateViewData(req.user ? req.user.id : null, bag)
                        viewData.messages = { success: 'Product removed from shopping bag.' }
                        viewData.user = req.user
                        viewData.csrfToken = req.csrfToken()
                        res.render('shopping_bag', viewData)
                    } catch (e) {
                        console.log('Error removing product ' + form.pid + ' shopping bag.')
                        console.error(e)
                        console.error(e.stack)
                        res.status(500)
                        let viewData = await handler.populateViewData(req.user ? req.user.id : null, req.session ? req.session.bag : null)
                        viewData.messages = { error: 'Unable to remove product from shopping bag.' }
                        viewData.csrfToken = req.csrfToken()
                        viewData.user = req.user
                        res.render('shopping_bag', viewData)
                    }
                    break
                case 'remove_from_bag':
                    try {
                        let bag = await handler.removeItem(req.user ? req.user.id : null, form.pid, form.quantity, req.session.bag)
                        let viewData = await handler.populateViewData(req.user ? req.user.id : null, bag)
                        viewData.messages = { success: 'Product removed from shopping bag.' }
                        viewData.csrfToken = req.csrfToken()
                        viewData.user = req.user
                        res.render('shopping_bag', viewData)
                    } catch (e) {
                        console.log('Error removing product ' + form.pid + ' shopping bag.')
                        console.error(e)
                        console.error(e.stack)
                        res.status(500)
                        let viewData = await handler.populateViewData(req.user ? req.user.id : null, req.session ? req.session.bag : null)
                        viewData.messages = { error: 'Unable to remove product from shopping bag.' }
                        viewData.user = req.user
                        viewData.csrfToken = req.csrfToken()
                        res.render('shopping_bag', viewData)
                    }
                    break
                default:
                    res.status(400)
                    res.redirect('/market') 
                    break
            }
        } else {
            res.status(400)
            res.redirect('/market')
        }
    } catch (e) {
        console.log(e)
        if (debug) {
            if (e.stack) console.error(e.stack)
        }
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Error retrieving data' }, name: '', user: req.user})
    }
})

module.exports = bag
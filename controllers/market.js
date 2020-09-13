const cfg = require('../configuration/index.js')
const express = require('express')
const product = require('../models/product')
const media = require('../adapters/storage/media')
const validator = require('../utilities/validator')
const debug = cfg.env == 'development' ? true : false

let market = express.Router()

let populateViewData = async (uid, product_page = 1) => {
    return new Promise(async (resolve, reject) => {
        let perPage = cfg.items_per_page ? cfg.items_per_page : 12
        pagination = true
        product_range = null
        console.log('Page: ' + product_page)
        if (pagination) {
            product_range = { pagination_skip: product_page, pagination_limit: perPage }
        }
        try {
            let viewData = {}
            products = await product.read({}, product_range)
            product_index = await product.count({}, product_range)

            if(validator.isNotNull(products)) {
                viewData.products = Array.isArray(products) ? products : [products]
            } else {
                viewData.products = []
            }

            for (const p of viewData.products) {
                if (Array.isArray(p.images) && p.images.length > 0) {
                    for (const img of p.images) {
                        img.src = media.getBinaryDetails(img)
                    }
                }
            }

            console.log(product_index)
            // Pagination details
            if (pagination) {
                viewData.product_pages = Math.ceil(product_index / perPage)
                viewData.current_page = product_page

            }
            if (debug) {
                console.log('View Data: ')
                console.log(viewData)
            }
            resolve(viewData)
        } catch (e) {
            reject(e)
        }
    })
}

market.use('/page/:page', async function (req, res, next) {
    try {

        if (validator.hasActiveSession(req)) {
            let page = req.params.page || 1
            let qd = req.query
            console.log(page)
            console.log(qd)
            let viewData = {}
            console.log('Page: ' + page)
            viewData = await populateViewData(req.user.id.toString(), product_page = parseInt(page))
            viewData.user = req.user
            res.render('market', viewData)
        } else {
            messages = { error: "You need to be signed in." }
            res.status(403)
            res.render('signin', { messages: messages })
        }
    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Error retrieving shop pagination data' }, name: '', user: req.user })

    }
})
market.get('/', async (req, res) => {
    try {
        let viewData = await populateViewData(validator.isNotNull(req.user) ? req.user.id : null)
        viewData.user = req.user
        res.render('market', viewData)

    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Error retrieving data' }, name: '', user: req.user })
    }
})

module.exports = market

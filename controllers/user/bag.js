const cfg = require('../../configuration')
const validator = require('../../utilities/validator')
const converter = require('../../utilities/converter')
const generator = require('../../utilities/generator')
const media = require('../../adapters/storage/media')
const user = require('../../models/user')
const shop = require('../../models/shop')
const product = require('../../models/product')
const catalog = require('../../models/catalog')
const express = require('express')
const debug = cfg.env == 'development' ? true : false

let bag = express.Router()

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

            if (validator.isNotNull(products)) {
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

bag.get('/', async (req, res) => {
    try {
        let viewData = await populateViewData(validator.isNotNull(req.user) ? req.user.id : null)
        viewData.user = req.user
        res.render('shopping_bag', viewData)

    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Error retrieving data' }, name: '', user: req.user })
    }
})

module.exports = bag
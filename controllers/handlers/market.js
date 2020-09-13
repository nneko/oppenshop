const cfg = require('../../configuration/index.js')
const validator = require('../../utilities/validator')
const product = require('../../models/product')
const media = require('../../adapters/storage/media')
const debug = cfg.env == 'development' ? true : false

let marketHandler = {}

marketHandler.populateViewData = async (uid, product_page = 1) => {
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

module.exports = marketHandler
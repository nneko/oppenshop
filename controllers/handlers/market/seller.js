const cfg = require('../../../configuration/index.js')
const validator = require('../../../utilities/validator')
const shop = require('../../../models/shop')
const product = require('../../../models/product')
const currency = require('../../../models/currency')
const media = require('../../../adapters/storage/media')
const debug = cfg.env == 'development' ? true : false
const generator = require('../../../utilities/generator')

let sellerHandler = {}

sellerHandler.populateViewData = async (sid, product_page = 1) => {
    return new Promise(async (resolve, reject) => {
        try {
            let perPage = cfg.items_per_page ? cfg.items_per_page : 12
            pagination = true
            product_range = null
            console.log('Page: ' + product_page)
            if (pagination) {
                product_range = { pagination_skip: product_page, pagination_limit: perPage }
            }
            let viewData = {}

            if (validator.isNotNull(sid)) {
                let fetchResult = await shop.read(sid,{findBy: 'id'})
                if(await shop.isValid(fetchResult)) {
                    viewData.shop = fetchResult
                }
            } 

            if(!viewData.shop) {
                let e = new Error('No shop found with id: ' + sid)
                e.name = 'ShopRetrievalError'
                e.type = 'Find Operation'
                throw e
            }

            if (Array.isArray(viewData.shop.images) && viewData.shop.images.length > 0) {
                for (const img of viewData.shop.images) {
                    img.src = media.read(img)
                }
            }

            products = await product.read({shop: String(viewData.shop._id)}, product_range)
            product_index = await product.count({ shop: String(viewData.shop._id)}, product_range)

            if (validator.isNotNull(products)) {
                viewData.products = Array.isArray(products) ? products : [products]
            } else {
                viewData.products = []
            }

            //Populate the currency list
            viewData.currency_list = {}
            let c = await currency.read({ status: 'active' })
            if (c) {
                if (Array.isArray(c)) {
                    for (let cIdx = 0; cIdx < c.length; cIdx++) {
                        if (currency.isValid(c[cIdx])) {
                            viewData.currency_list[c[cIdx]._id.toString()] = c[cIdx]
                        }
                    }
                }
            }

            for (const p of viewData.products) {
                if (Array.isArray(p.images) && p.images.length > 0) {
                    for (const img of p.images) {
                        img.src = media.read(img)
                    }
                }
                if (p.currency) p.currency = viewData.currency_list[p.currency]
            }

            console.log(product_index)
            // Pagination details
            if (pagination) {
                viewData.product_pages = Math.ceil(product_index / perPage)
                viewData.current_page = product_page

            }

            // Add the generator module to the viewData to allow address formatting and parsing on the view
            viewData.generator = generator

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

module.exports = sellerHandler
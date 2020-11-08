const cfg = require('../../configuration/index.js')
const validator = require('../../utilities/validator')
const user = require('../../models/user')
const product = require('../../models/product')
const media = require('../../adapters/storage/media')
const ShoppingBag = require('../../models/shoppingbag')
const generator = require('../../utilities/generator')
const currency = require('../../models/currency')
const debug = cfg.env == 'development' ? true : false

let checkoutHandler = {}

checkoutHandler.populateViewData = async (uid, bag, product_page = 1) => {
    return new Promise(async (resolve, reject) => {
        let perPage = cfg.items_per_page ? cfg.items_per_page : 12
        pagination = true
        product_range = null

        if (pagination) {
            product_range = { pagination_skip: product_page, pagination_limit: perPage }
        }
        try {
            let bagCurrency = await currency.read({ code: cfg.base_currency_code }, { limit: 1 })

            if (!currency.isValid(bagCurrency)) {
                let currencyError = new Error('Unable to set shopping bag currency')
                throw currencyError
            }

            let viewData = {}

            viewData.charges = []

            let shippingCharges = {
                name: 'Shipping',
                value: 0,
                currency: bagCurrency.code
            }

            let processingCharges = {
                name: 'Handling and processing',
                value: bag.total() > 0 ? 0.03 * bag.total() : 0,
                currency: bagCurrency.code
            }

            let taxCharges = {
                name: 'Taxes',
                value: bag.total() > 0 ? 0.15 * bag.total() : 0,
                currency: bagCurrency.code
            }

            viewData.charges.push(shippingCharges)
            viewData.charges.push(processingCharges)
            viewData.charges.push(taxCharges)

            viewData.total = {
                value: (bag ? bag.total() : 0 ) + shippingCharges.value + processingCharges.value + taxCharges.value,
                currency: bagCurrency.code
            }

            resolve(viewData)
        } catch (e) {
            reject(e)
        }
    })
}

module.exports = checkoutHandler
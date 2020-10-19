const cfg = require('../../../configuration/index.js')
const validator = require('../../../utilities/validator')
const user = require('../../../models/user')
const product = require('../../../models/product')
const media = require('../../../adapters/storage/media')
const ShoppingBag = require('./../../../models/shoppingbag')
const generator = require('../../../utilities/generator')
const currency = require('../../../models/currency')
const debug = cfg.env == 'development' ? true : false

let bagHandler = {}

bagHandler.populateViewData = async (uid, bag, product_page = 1) => {
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

            viewData.formatter = generator
            viewData.bag = new ShoppingBag(bag, bagCurrency)

            for (const key of Object.keys(viewData.bag.items)) {
                if (viewData.bag.items[key].image) {
                    viewData.bag.items[key].image.src = media.getBinaryDetails(viewData.bag.items[key].image)
                }
            }
            resolve(viewData)
        } catch (e) {
            reject(e)
        }
    })
}

bagHandler.addItem = async (uid, pid, qty, bag) => {
    let bagCurrency = await currency.read({ code: cfg.base_currency_code }, { limit: 1 })

    if (!currency.isValid(bagCurrency)) {
        let currencyError = new Error('Unable to set shopping bag currency')
        throw currencyError
    }
    let bg = new ShoppingBag(bag,bagCurrency)
    let p = await product.read(pid, { findBy: 'id' })
    await bg.add(p, Number(qty))
    if (uid) {
        let u = await user.read(uid, { findBy: 'id' })
        if(user.isValid(u)) await bg.save(u)
    }
    if (debug) console.log(bg)
    return bg
}

bagHandler.removeItem = async (uid, pid, qty, bag) => {
    let bagCurrency = await currency.read({ code: cfg.base_currency_code }, { limit: 1 })

    if (!currency.isValid(bagCurrency)) {
        let currencyError = new Error('Unable to set shopping bag currency')
        throw currencyError
    }
    let bg = new ShoppingBag(bag,bagCurrency)
    let p = await product.read(pid, { findBy: 'id' })
    bg.remove(p, Number(qty))
    if (uid) {
        let u = await user.read(uid, { findBy: 'id' })
        if (user.isValid(u)) await bg.save(u)
    }
    if (debug) console.log(bg)
    return bg
}

bagHandler.deleteItem = async (uid, pid, bag) => {
    let bagCurrency = await currency.read({ code: cfg.base_currency_code }, { limit: 1 })

    if (!currency.isValid(bagCurrency)) {
        let currencyError = new Error('Unable to set shopping bag currency')
        throw currencyError
    }
    let bg = new ShoppingBag(bag,bagCurrency)
    let p = await product.read(pid, { findBy: 'id' })
    if(debug) console.log(p)
    bg.delete(p)
    if (uid) {
        let u = await user.read(uid, { findBy: 'id' })
        if (user.isValid(u)) await bg.save(u)
    }
    if (debug) console.log(bg)
    return bg
}

module.exports = bagHandler
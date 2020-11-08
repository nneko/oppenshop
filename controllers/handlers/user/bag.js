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
            let sb = new ShoppingBag(bag, bagCurrency)
            viewData.bag = {
                currency: sb.currency,
                quantity: sb.quantity,
                total: sb.total,
                items: {}
            }

            for (const key of Object.keys(sb.items)) {
                viewData.bag.items[key] = sb.items[key]
                let p = await product.read(key,{findBy: 'id'})
                if(await product.isValid(p)) {
                    viewData.bag.items[key].price = p.price
                    let productCurrency = await currency.read(p.currency, {findBy: 'id'})
                    if(currency.isValid(productCurrency)) {
                        viewData.bag.items[key].currency = productCurrency.code
                    } else {
                        viewData.bag.items[key].currency = bagCurrency.code
                    }
                    viewData.bag.items[key].displayName = p.displayName
                    viewData.bag.items[key].name = p.name

                    if (Array.isArray(p.images) && p.images.length > 0) {
                        let img = {}
                        let primaryImgIdx = generator.getPrimaryFieldIndex(p.images)
                        if (primaryImgIdx > 0) {
                            img = p.images[primaryImgIdx]
                        } else img = p.images[0]
                        img.src = media.read(img)
                        viewData.bag.items[key].image = img
                    } else viewData.bag.items[key].image = null
                }
            }

            let u = await user.read(uid, { findBy: 'id' })
            if (user.isValid(u)) await sb.save(u)
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
    await bg.remove(p, Number(qty))
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
    await bg.delete(p)
    if (uid) {
        let u = await user.read(uid, { findBy: 'id' })
        if (user.isValid(u)) await bg.save(u)
    }
    if (debug) console.log(bg)
    return bg
}

module.exports = bagHandler
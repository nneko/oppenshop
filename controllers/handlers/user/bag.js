const cfg = require('../../../configuration/index.js')
const validator = require('../../../utilities/validator')
const user = require('../../../models/user')
const product = require('../../../models/product')
const media = require('../../../adapters/storage/media')
const ShoppingBag = require('./../../../models/shoppingbag')
const debug = cfg.env == 'development' ? true : false

let bagHandler = {}

bagHandler.populateViewData = async (uid, bag, product_page = 1) => {
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

            viewData.bag = new ShoppingBag(bag)

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
    let bg = new ShoppingBag(bag)
    let p = await product.read(pid, { findBy: 'id' })
    bg.add(p, Number(qty))
    if (uid) {
        let u = await user.read(uid, { findBy: 'id' })
        if(user.isValid(u)) await bg.save(u)
    }
    if (debug) console.log(bg)
    return bg
}

bagHandler.removeItem = async (uid, pid, qty, bag) => {
    let bg = new ShoppingBag(bag)
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
    let bg = new ShoppingBag(bag)
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
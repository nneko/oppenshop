const cfg = require('../../../configuration/index.js')
const validator = require('../../../utilities/validator')
const product = require('../../../models/product')
const currency = require('../../../models/currency')
const media = require('../../../adapters/storage/media')
const shop = require('../../../models/shop.js')
const ShoppingBag = require('./../../../models/shoppingbag')
const marketProduct = require('../../market/product.js')
const debug = cfg.env == 'development' ? true : false

let marketProductHandler = {}

marketProductHandler.populateViewData = async (pid) => {
    return new Promise(async (resolve, reject) => {
        try {
            let viewData = {}

            if (validator.isNotNull(pid)) {
                let fetchResult = await product.read(pid,{findBy: 'id'})
                fetchResult.currency = await currency.read(fetchResult.currency,{findBy: 'id'})
                if(await product.isValid(fetchResult)) {
                    viewData.product = fetchResult
                    let shopInfo = await shop.read(fetchResult.shop,{findBy: 'id'})
                    if(await shop.isValid(shopInfo)) {
                        viewData.product.shopName = shopInfo.displayName
                    }
                }
            }

            if(!viewData.product) {
                let e = new Error('No product found with id: ' + pid)
                e.name = 'ProductRetrievalError'
                e.type = 'Find Operation'
                throw e
            }

            if (Array.isArray(viewData.product.images) && viewData.product.images.length > 0) {
                for (const img of viewData.product.images) {
                    img.src = media.getBinaryDetails(img)
                }
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

module.exports = marketProductHandler

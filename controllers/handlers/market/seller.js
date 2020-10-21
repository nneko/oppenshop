const cfg = require('../../../configuration/index.js')
const validator = require('../../../utilities/validator')
const shop = require('../../../models/shop')
const media = require('../../../adapters/storage/media')
const debug = cfg.env == 'development' ? true : false
const generator = require('../../../utilities/generator')

let sellerHandler = {}

sellerHandler.populateViewData = async (sid) => {
    return new Promise(async (resolve, reject) => {
        try {
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
const cfg = require('../../../configuration/index.js')
const validator = require('../../../utilities/validator')
const shop = require('../../../models/shop')
const media = require('../../../adapters/storage/media')
const debug = cfg.env == 'development' ? true : false

let shopsHandler = {}

shopsHandler.populateViewData = async (uid, shops_page = 1) => {
    return new Promise(async (resolve, reject) => {
        let perPage = cfg.items_per_page ? cfg.items_per_page : 12
        pagination = true
        shops_range = null
        console.log('Page: ' + shops_page)
        if (pagination) {
            shops_range = { pagination_skip: shops_page, pagination_limit: perPage }
        }
        try {
            let viewData = {}
            shops = await shop.read({}, shops_range)
            shops_index = await shop.count({}, shops_range)

            if (validator.isNotNull(shops)) {
                viewData.shops = Array.isArray(shops) ? shops : [shops]
            } else {
                viewData.shops = []
            }

            for (const p of viewData.shops) {
                if (Array.isArray(p.images) && p.images.length > 0) {
                    for (const img of p.images) {
                        img.src = media.read(img)
                    }
                }
            }

            console.log(shops_index)
            // Pagination details
            if (pagination) {
                viewData.shops_pages = Math.ceil(shops_index / perPage)
                viewData.current_page = shops_page

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

module.exports = shopsHandler
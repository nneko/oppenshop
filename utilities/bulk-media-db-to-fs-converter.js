const cfg = require('../configuration')
const shop = require('../models/shop')
const product = require('../models/product')
const catalog = require('../models/catalog')
const debug = cfg.env == 'development' ? true : false
const media = require('../adapters/storage/media')
const generator = require('./generator')
const db = require('../adapters/storage/' + cfg.dbAdapter)

if (!module.parent) {
    db.connect().then(async (result) => {
        try {
            let products = await product.read({})
            let shops = await shop.read({})
            let catalogs = await catalog.read({})
            if (shops) {
                console.log('Converting shop images')
                if (!Array.isArray(shops)) {
                    shops = [shops]
                }
                for (const s of shops) {
                    if (s.images && Array.isArray(s.images) && s.images.length > 0) {
                        let newShopImages = []
                        for (const img of s.images) {
                            if (img.storage && img.storage == 'db') {
                                try {
                                    let imgPath = '/shop/' + String(s._id) + '/' + ((img.originalname) ? img.originalname : generator.uuid())
                                    await media.write(img, imgPath)
                                    let newImg = {}
                                    newImg.path = imgPath
                                    newImg.storage = 'fs'
                                    newImg.originalname = img.originalname
                                    newImg.fieldname = img.fieldname
                                    newImg.mimetype = img.mimetype
                                    newShopImages.push(newImg)
                                } catch (mer) {
                                    console.log('Error during image migration for ' + String(s._id))
                                    console.log(mer)
                                    throw mer
                                }
                            } else {
                                newShopImages.push(img)
                            }
                        }
                        await shop.update({ _id: s._id }, { images: newShopImages })
                    }
                }
            }

            if (products) {
                console.log('Converting product images')
                if(! Array.isArray(products)) {
                    products = [products]
                }
                for (const p of products) {
                    if (p.images && Array.isArray(p.images) && p.images.length > 0) {
                        let newProductImages = []
                        for (const img of p.images) {
                            if(img.storage && img.storage == 'db') {
                                try {
                                    let imgPath = '/product/' + String(p._id) + '/' + ((img.originalname) ? img.originalname : generator.uuid())
                                    await media.write(img, imgPath)
                                    let newImg = {}
                                    newImg.path = imgPath
                                    newImg.storage = 'fs'
                                    newImg.originalname = img.originalname
                                    newImg.fieldname = img.fieldname
                                    newImg.mimetype = img.mimetype
                                    newProductImages.push(newImg)
                                } catch (mer) {
                                    console.log('Error during image migration for ' + String(p._id))
                                    console.log(mer)
                                    throw mer
                                }
                            } else {
                                newProductImages.push(img)
                            }
                        }
                        await product.update({_id: p._id}, {images: newProductImages})
                    }
                }
            }

            if (catalogs) {
                console.log('Converting catalog images')
                if (!Array.isArray(catalogs)) {
                    catalogs = [catalogs]
                }
                for (const c of catalogs) {
                    if (c.image) {
                        let img = c.image
                        let newCatalogImages = img
                        if (img.storage && img.storage == 'db') {
                            try {
                                let imgPath = '/catalog/' + String(c._id) + '/' + ((img.originalname) ? img.originalname : generator.uuid())
                                await media.write(img, imgPath)
                                let newImg = {}
                                newImg.path = imgPath
                                newImg.storage = 'fs'
                                newImg.originalname = img.originalname
                                newImg.fieldname = img.fieldname
                                newImg.mimetype = img.mimetype
                                newCatalogImages = newImg
                            } catch (mer) {
                                console.log('Error during image migration for ' + String(c._id))
                                console.log(mer)
                                throw mer
                            }
                        } 

                        await catalog.update({ _id: c._id }, { image: newCatalogImages })
                    }
                }
            }
            
            await db.close()
            if (debug) console.log('\x1b[32m%s\x1b[0m', 'Exiting.')
            process.exit(0)
        } catch (err) {
            console.log('Existing due to error')
            console.log(err)
            if (err.stack) console.error(err.stack)
            process.exit(-1)
        }
    }).catch(e => {
        if (debug) {
            console.log('Exiting due to error: ')
            console.log(e)
            if(e.stack) console.error(e.stack)
        }
        process.exit(-1)
    })
}
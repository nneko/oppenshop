const cfg = require('../configuration')
const idx = cfg.indexerAdapter ? require('../adapters/indexer/' + cfg.indexerAdapter) : null
const productIdx = cfg.indexerProductIndex ? cfg.indexerProductIndex : 'products-index'
const user = require('../models/user')
const shop = require('../models/shop')
const product = require('../models/product')
const validator = require('./validator')
const debug = cfg.env == 'development' ? true : false


const db = require('../adapters/storage/' + cfg.dbAdapter)

if (!module.parent) {
    db.connect().then(async (result) => {
        try {
            let products = await product.read({})
            if (products) {
                let result = null
                if(Array.isArray(products)) {
                    for (const p of products) {
                        result = await idx.index(productIdx, {
                            ref: p._id,
                            name: p.name,
                            displayName: p.displayName,
                            description: p.description,
                            specifications: p.specifications,
                            price: p.price,
                            currency: p.currency,
                            status: p.status
                        })
                        console.log(result)
                    }
                } else {
                    result = await idx.index(productIdx, {
                        ref: products._id,
                        name: products.name,
                        displayName: products.displayName,
                        description: products.description,
                        specifications: products.specifications,
                        price: products.price,
                        currency: products.currency,
                        status: products.status
                    })
                    console.log(result)
                }
                await db.close()
                if (debug) console.log('\x1b[32m%s\x1b[0m', 'Exiting.')
                process.exit(0)
            } else {
                console.log('No matching entries in database to index.')
                await db.close()
                if (debug) console.log('\x1b[32m%s\x1b[0m', 'Exiting.')
                process.exit(0)
            }
        } catch (err) {
            console.log('Existing due to error')
            console.log(err)
            if (err.stack) console.error(e.stack)
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
const cfg = require('../configuration')
const idx = cfg.indexerAdapter ? require('../adapters/indexer/' + cfg.indexerAdapter) : null
const productIdx = cfg.indexerProductIndex ? cfg.indexerProductIndex : 'products-index'
const defaultCurrencyCode = cfg.base_currency_code ? cfg.base_currency_code : 'JMD'
const currency = require('../models/currency')
const product = require('../models/product')
const debug = cfg.env == 'development' ? true : false


const db = require('../adapters/storage/' + cfg.dbAdapter)

if (!module.parent) {
    db.connect().then(async (result) => {
        try {
            let defaultCurrency = await currency.read({code: defaultCurrencyCode}, {limit: 1})
            if (! currency.isValid(defaultCurrency)) {
                let error = new Error('Unable to find default currency identified by code: ' + defaultCurrencyCode)
                error.name = 'CurrencyError'
                error.type = 'Not Found'
                throw e
            }
            let products = await product.read({})
            if (products) {
                let result = null
                if(Array.isArray(products)) {
                    for (const p of products) {
                        let pCurrency = await currency.read(p._id,{findBy: 'id'})
                        if(! currency.isValid(pCurrency)) pCurrency = defaultCurrency
                        p.currency = pCurrency._id.toString()
                        result = await product.update({name: p.name}, p)
                        /* TODO: Update search index
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
                        */
                        console.log(result)
                    }
                } else {
                    let pCurrency = await currency.read(products._id,{findBy: 'id'})
                    if (!currency.isValid(pCurrency)) pCurrency = defaultCurrency
                    p.currency = pCurrency._id
                    result = await product.update({ name: products.name }, p)
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
const cfg = require('../configuration')
const db = require('../adapters/storage/'+cfg.dbAdapter)
const validator = require('../utilities/validator')
const debug = cfg.env == 'development' ? true : false
const product = require('./product')
const shop = require('./shop')

let catalog = {}

catalog.isValid = async (c) => {
    try {
        let shopExists = null
        if(validator.isNotNull(c) && typeof(c.owner) !== 'undefined') {
            shopExists = await shop.read(c.owner, { findBy: 'id' })
            if (await shop.isValid(shopExists)) {
                shopExists = true
            } else {
                shopExists = false
            }
        }
        if(debug) {
            console.log('Checking catalog shop validity')
            console.log('Found shop: ')
            console.log(shopExists)
        }
        if (validator.isNotNull(shopExists) && c.hasOwnProperty('name') && c.hasOwnProperty('description') && c.hasOwnProperty('products') && typeof(c.name) == 'string' && validator.isNotNull(c.name) && typeof(c.description) == 'string' && validator.isNotNull(c.description) && validator.isNotNull(c.products) && Array.isArray(c.products)) {
            return true
        } else {
            return false
        }
    } catch (e) {
        console.error(e)
        throw e
    }
}

catalog.exists = async (c) => {
    try {
        const doc = await catalog.read(c,{limit: 1})
        let result = await catalog.isValid(doc) ? true : false
        if(debug) {
            console.log('Checking catalog exits: ')
            console.log(c)
            console.log('Catalog exists ' + result)
        }
        return result
    } catch (e) {
        if(debug) console.log(e)
        throw new Error('Unable to query database')
    }
}

catalog.create = (c) => {
    return new Promise(async (resolve,reject) => {
        try {
            if(!await catalog.isValid(c)){
                let e = new Error('Invalid catalog object')
                e.name = 'CatalogError'
                e.type = 'Invalid'
                throw e
            }

            if (await catalog.exists({name: c.name.toLowerCase()})) {
                let e = new Error('Catalog already exists')
                e.name = 'CatalogError'
                e.type = 'Duplicate'
                throw e
            }

            if (!validator.isNotNull(c.displayName)) c.displayName = c.name
            c.name = c.name.toLowerCase()

            const result = await db.get().collection('catalogs').insertOne(c)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

catalog.read = (properties, options) => {
    return new Promise(async (resolve, reject) => {
        try {
            const catalogCollection = db.get().collection('catalogs')
            if(validator.isNotNull(options)) {
                if(typeof(options.limit) !== 'undefined') {
                    switch(options.limit) {
                        case 1:
                            const result = await catalogCollection.findOne(properties)
                            resolve(result)
                            break
                        default:
                            const cursor = await catalogCollection.find(properties).limit(options.limit)
                            resolve(cursor.toArray())
                            break
                    }
                } else if(typeof(options.findBy) !== 'undefined') {
                    switch(options.findBy){
                        case 'id':
                            const result = await catalogCollection.findOne({'_id': db.getObjectId(properties)})
                            resolve(result)
                            break
                        default:
                            const cursor = await catalogCollection.find(properties).limit(1)
                            resolve(cursor.toArray())
                            break
                    }
                } else {
                    let e = new Error('Invalid options to find operator')
                    e.name = 'CatalogError'
                    e.type = 'Find Operation'
                    throw e
                }
            } else {
                const cursor = await catalogCollection.find(properties)
                resolve(cursor.toArray())
            }
        } catch (e) {
            reject(e)
        }
    })
}

catalog.update = (filters, values, options, operator) => {
    return new Promise(async (resolve, reject) => {
        try {
            let opr = '$set'
            switch(operator){
                case 'unset':
                    opr = '$unset'
                    break
                case 'rename':
                    opr = '$rename'
                    break
                case 'set':
                    break
                default:
                    if (validator.isNotNull(operator)) {
                        let e = new Error('Invalid catalog operation')
                        e.name = 'CatalogError'
                        e.type = 'Invalid Operation'
                        throw e
                    }
            }
            const catalogCollection = db.get().collection('catalogs')
            let operation = {}
            if (validator.isNotNull(values) && typeof (values.name) == 'string') {
                values.name = values.name.toLowerCase()
            }
            operation[opr] = values
            const result = await catalogCollection.updateMany(filters,operation,options)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

catalog.delete = (filters) => {
    return new Promise(async (resolve, reject) => {
        try {
            const catalogCollection = db.get().collection('catalogs')
            const result = await catalogCollection.deleteMany(filters)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

module.exports = catalog

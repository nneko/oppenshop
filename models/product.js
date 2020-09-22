const cfg = require('../configuration')
const db = require('../adapters/storage/'+cfg.dbAdapter)
const validator = require('../utilities/validator')
const debug = cfg.env == 'development' ? true : false
const shop = require('./shop')

let product = {}

product.isValid = async (p) => {
    try {
        //If product is associated with shop validate that shop exists
        let shopExists = null
        if (validator.isNotNull(p) && typeof(p.shop) !== 'undefined') {
            shopExists = await shop.read(p.shop, { findBy: 'id' })
            if(await shop.isValid(shopExists)) {
                shopExists = true
            } else {
                shopExists = false
            }
        }
            /*
            if(!shopExists) {
                let e = new Error('Cannot create product using invalid shop')
                e.name = 'ProductError'
                e.type = 'Invalid Shop'
                throw e
            }*/

        if (shopExists && typeof(p.name) == 'string' && validator.isNotNull(p.name) && typeof (p.description) == 'string' && validator.isNotNull(p.description) && p.hasOwnProperty('images') && p.hasOwnProperty('specifications') && p.hasOwnProperty('price') && p.hasOwnProperty('quantity') /*&& p.hasOwnProperty('currecy') && p.hasOwnProperty('isSKU') && p.hasOwnProperty('SKU')*/) {
            return true
        } else {
            return false
        }
    } catch (e) {
        console.error(e)
        throw e
    }
}

product.exists = async (p) => {
    try {
        const result = validator.isNotNull(await product.read(p,{limit: 1}))
        if(debug) {
            console.log('Checking product exits: ')
            console.log(p)
            console.log('Product exists ' + result)
        }
        return result
    } catch (e) {
        if(debug) console.log(e)
        throw new Error('Unable to query database')
    }
}

product.create = (p) => {
    return new Promise(async (resolve,reject) => {
        try {
            if(!await product.isValid(p)){
                let e = new Error('Invalid product object')
                e.name = 'ProductError'
                e.type = 'Invalid'
                throw e
            }

            if (await product.exists({ name: p.name, shop: p.shop })) {
                let e = new Error('Product already exists')
                e.name = 'ProductError'
                e.type = 'Duplicate'
                throw e
            }

            if(!validator.isNotNull(p.displayName)) p.displayName = p.name
            p.name = p.name.toLowerCase()

            const result = await db.get().collection('products').insertOne(p)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

product.read = (properties, options) => {
    return new Promise(async (resolve, reject) => {
        try {
            const productCollection = db.get().collection('products')
            if(validator.isNotNull(options)) {
                if(typeof(options.limit) !== 'undefined') {
                    switch(options.limit) {
                        case 1:
                            const result = await productCollection.findOne(properties)
                            resolve(result)
                            break
                        default:
                            const cursor = await productCollection.find(properties).limit(options.limit)
                            resolve(cursor.toArray())
                            break
                    }
                } else if(typeof(options.findBy) !== 'undefined') {
                    switch(options.findBy){
                        case 'id':
                            const result = await productCollection.findOne({'_id': db.getObjectId(properties)})
                            resolve(result)
                            break
                        default:
                            const cursor = await productCollection.find(properties).limit(1)
                            resolve(cursor.toArray())
                            break
                    }
                } else if (typeof (options.pagination_skip) !== 'undefined') {
                    if (Number.isInteger(options.pagination_skip)) {
                        if (typeof (options.pagination_limit) !== 'undefined') {
                            if (Number.isInteger(options.pagination_skip)) {
                                const cursor = await productCollection.find(properties)
                                    .skip((options.pagination_limit * options.pagination_skip) - options.pagination_limit)
                                    .limit(options.pagination_limit)
                                resolve(cursor.toArray())
                            } else {
                                // TODO
                                console.log('Product Model: Read - need to add condition.' + options.pagination_skip + ' ' + options.pagination_limit)
                            }
                        } else {
                            // TODO
                            console.log('Product Model: Read - need to add condition.' + options.pagination_skip + ' ' + options.pagination_limit)
                        }
                    } else {
                        // TODO
                        console.log('Product Model: Read - need to add condition.' + options.pagination_skip)
                    }
                    switch (options.findBy) {
                        case 'id':
                            const result = await productCollection.findOne({ '_id': db.getObjectId(properties) })
                            resolve(result)
                            break
                        default:
                            const cursor = await productCollection.find(properties)
                            resolve(cursor.toArray())
                            break
                    }
                } else {
                    let e = new Error('Invalid options to find operator')
                    e.name = 'ProductError'
                    e.type = 'Find Operation'
                    throw e
                }
            } else {
                const cursor = await productCollection.find(properties)
                resolve(cursor.toArray())
            }
        } catch (e) {
            reject(e)
        }
    })
}

product.update = (filters, values, options, operator) => {
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
                        let e = new Error('Invalid product operation')
                        e.name = 'ProductError'
                        e.type = 'Invalid Operation'
                        throw e
                    }
            }
            const productCollection = db.get().collection('products')
            let operation = {}
            if (validator.isNotNull(values) && typeof (values.name) == 'string') {
                values.name = values.name.toLowerCase()
            }
            operation[opr] = values
            const result = await productCollection.updateMany(filters,operation,options)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

product.delete = (filters) => {
    return new Promise(async (resolve, reject) => {
        try {
            const productCollection = db.get().collection('products')
            const result = await productCollection.deleteMany(filters)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

product.count = (properties, options) => {
    return new Promise(async (resolve, reject) => {
        try {
            const productCollection = db.get().collection('products')
            if (validator.isNotNull(options)) {
                if (typeof (options.limit) !== 'undefined') {
                    switch (options.limit) {
                        case 1:
                            const result = await productCollection.count(properties)
                            resolve(result)
                            break
                        default:
                            const cursor = await productCollection.count(properties).limit(options.limit)
                            resolve(cursor)
                            break
                    }
                } else if (typeof (options.findBy) !== 'undefined') {
                    switch (options.findBy) {
                        case 'id':
                            const result = await productCollection.count({ '_id': db.getObjectId(properties) })
                            resolve(result)
                            break
                        default:
                            const cursor = await productCollection.count(properties)
                            resolve(cursor)
                            break
                    }
                } else if (typeof (options.pagination_skip) !== 'undefined') {
                    if (Number.isInteger(options.pagination_skip)) {
                        if (typeof (options.pagination_limit) !== 'undefined') {
                            if (Number.isInteger(options.pagination_skip)) {
                                const cursor = await productCollection.count(properties)
                                //.skip((options.pagination_limit * options.pagination_skip) - options.pagination_limit)
                                //.limit(options.pagination_limit)
                                //resolve(cursor.toArray())
                                resolve(cursor)
                            } else {
                                // TODO
                                console.log('Product Model: Count - need to add condition.' + options.pagination_skip + ' ' + options.pagination_limit)
                            }
                        } else {
                            // TODO
                            console.log('Product Model: Count - need to add condition.' + options.pagination_skip + ' ' + options.pagination_limit)
                        }
                    } else {
                        // TODO
                        console.log('Product Model: Count - need to add condition.' + options.pagination_skip)
                    }
                    switch (options.findBy) {
                        case 'id':
                            const result = await productCollection.count({ '_id': db.getObjectId(properties) })
                            resolve(result)
                            break
                        default:
                            const cursor = await productCollection.count(properties)
                            resolve(cursor)
                            break
                    }
                } else {
                    let e = new Error('Invalid options to find operator')
                    e.name = 'ShopError'
                    e.type = 'Find Operation'
                    throw e
                }
            } else {
                const cursor = await productCollection.count(properties)
                resolve(cursor)
            }
        } catch (e) {
            reject(e)
        }
    })
}

module.exports = product

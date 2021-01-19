const cfg = require('../configuration')
const db = require('../adapters/storage/' + cfg.dbAdapter)
const validator = require('../utilities/validator')
const debug = cfg.env == 'development' ? true : false
const warehouse = require('./warehouse')

let package = {}

package.isValid = async (p) => {
    try {
        //If package is associated with a warehouse. Validate that warehouse exists
        let warehouseExists = null
        if (validator.isNotNull(p) && typeof (p.warehouse) !== 'undefined') {
            warehouseExists = await warehouse.read(p.warehouse, { findBy: 'id' })
            if (await warehouse.isValid(warehouseExists)) {
                warehouseExists = true
            } else {
                warehouseExists = false
            }
        }

        if (warehouseExists && typeof (p.tracknum) == 'string' && validator.isNotNull(p.tracknum) && typeof (p.courier) == 'string' && validator.isNotNull(p.courier) && p.hasOwnProperty('invoices') && p.hasOwnProperty('declaredValue') && p.hasOwnProperty('declaredValueCurrency') && p.hasOwnProperty('serviceType') && p.hasOwnProperty('description')) {
            return true
        } else {
            return false
        }
    } catch (e) {
        console.error(e)
        throw e
    }
}

package.exists = async (p) => {
    try {
        const doc = await package.read(p, { limit: 1 })
        let result = await package.isValid(doc) ? true : false
        if (debug) {
            console.log('Checking package exits: ')
            console.log(p)
            console.log('package exists ' + result)
        }
        return result
    } catch (e) {
        if (debug) console.log(e)
        throw new Error('Unable to query database')
    }
}

package.create = (p) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!await package.isValid(p)) {
                let e = new Error('Invalid package object')
                e.name = 'packageError'
                e.type = 'Invalid'
                throw e
            }

            if (await package.exists({ tracknum: p.tracknum.toLowerCase(), warehouse: p.warehouse })) {
                let e = new Error('package already exists')
                e.name = 'packageError'
                e.type = 'Duplicate'
                throw e
            }

            const result = await db.get().collection('packages').insertOne(p)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

package.read = (properties, options) => {
    return new Promise(async (resolve, reject) => {
        try {
            const packageCollection = db.get().collection('packages')
            if (validator.isNotNull(options)) {
                if (typeof (options.limit) !== 'undefined') {
                    switch (options.limit) {
                        case 1:
                            const result = await packageCollection.findOne(properties)
                            resolve(result)
                            break
                        default:
                            const cursor = await packageCollection.find(properties).limit(options.limit)
                            resolve(cursor.toArray())
                            break
                    }
                } else if (typeof (options.findBy) !== 'undefined') {
                    switch (options.findBy) {
                        case 'id':
                            const result = await packageCollection.findOne({ '_id': db.getObjectId(properties) })
                            resolve(result)
                            break
                        default:
                            const cursor = await packageCollection.find(properties).limit(1)
                            resolve(cursor.toArray())
                            break
                    }
                } else if (typeof (options.pagination_skip) !== 'undefined') {
                    if (Number.isInteger(options.pagination_skip)) {
                        if (typeof (options.pagination_limit) !== 'undefined') {
                            if (Number.isInteger(options.pagination_skip)) {
                                const cursor = await packageCollection.find(properties)
                                    .skip((options.pagination_limit * options.pagination_skip) - options.pagination_limit)
                                    .limit(options.pagination_limit)
                                resolve(cursor.toArray())
                            } else {
                                // TODO
                                console.log('package Model: Read - need to add condition.' + options.pagination_skip + ' ' + options.pagination_limit)
                            }
                        } else {
                            // TODO
                            console.log('package Model: Read - need to add condition.' + options.pagination_skip + ' ' + options.pagination_limit)
                        }
                    } else {
                        // TODO
                        console.log('package Model: Read - need to add condition.' + options.pagination_skip)
                    }
                    switch (options.findBy) {
                        case 'id':
                            const result = await packageCollection.findOne({ '_id': db.getObjectId(properties) })
                            resolve(result)
                            break
                        default:
                            const cursor = await packageCollection.find(properties)
                            resolve(cursor.toArray())
                            break
                    }
                } else {
                    let e = new Error('Invalid options to find operator')
                    e.name = 'packageError'
                    e.type = 'Find Operation'
                    throw e
                }
            } else {
                const cursor = await packageCollection.find(properties)
                resolve(cursor.toArray())
            }
        } catch (e) {
            reject(e)
        }
    })
}

package.update = (filters, values, options, operator) => {
    return new Promise(async (resolve, reject) => {
        try {
            let opr = '$set'
            switch (operator) {
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
                        let e = new Error('Invalid package operation')
                        e.name = 'packageError'
                        e.type = 'Invalid Operation'
                        throw e
                    }
            }
            const packageCollection = db.get().collection('packages')
            let operation = {}
            if (validator.isNotNull(values) && typeof (values.name) == 'string') {
                values.name = values.name.toLowerCase()
            }
            operation[opr] = values
            const result = await packageCollection.updateMany(filters, operation, options)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

package.delete = (filters) => {
    return new Promise(async (resolve, reject) => {
        try {
            const packageCollection = db.get().collection('packages')
            const result = await packageCollection.deleteMany(filters)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

package.count = (properties, options) => {
    return new Promise(async (resolve, reject) => {
        try {
            const packageCollection = db.get().collection('packages')
            if (validator.isNotNull(options)) {
                if (typeof (options.limit) !== 'undefined') {
                    switch (options.limit) {
                        case 1:
                            const result = await packageCollection.count(properties)
                            resolve(result)
                            break
                        default:
                            const cursor = await packageCollection.count(properties).limit(options.limit)
                            resolve(cursor)
                            break
                    }
                } else if (typeof (options.findBy) !== 'undefined') {
                    switch (options.findBy) {
                        case 'id':
                            const result = await packageCollection.count({ '_id': db.getObjectId(properties) })
                            resolve(result)
                            break
                        default:
                            const cursor = await packageCollection.count(properties)
                            resolve(cursor)
                            break
                    }
                } else if (typeof (options.pagination_skip) !== 'undefined') {
                    if (Number.isInteger(options.pagination_skip)) {
                        if (typeof (options.pagination_limit) !== 'undefined') {
                            if (Number.isInteger(options.pagination_skip)) {
                                const cursor = await packageCollection.count(properties)
                                //.skip((options.pagination_limit * options.pagination_skip) - options.pagination_limit)
                                //.limit(options.pagination_limit)
                                //resolve(cursor.toArray())
                                resolve(cursor)
                            } else {
                                // TODO
                                console.log('package Model: Count - need to add condition.' + options.pagination_skip + ' ' + options.pagination_limit)
                            }
                        } else {
                            // TODO
                            console.log('package Model: Count - need to add condition.' + options.pagination_skip + ' ' + options.pagination_limit)
                        }
                    } else {
                        // TODO
                        console.log('package Model: Count - need to add condition.' + options.pagination_skip)
                    }
                    switch (options.findBy) {
                        case 'id':
                            const result = await packageCollection.count({ '_id': db.getObjectId(properties) })
                            resolve(result)
                            break
                        default:
                            const cursor = await packageCollection.count(properties)
                            resolve(cursor)
                            break
                    }
                } else {
                    let e = new Error('Invalid options to find operator')
                    e.name = 'packageError'
                    e.type = 'Find Operation'
                    throw e
                }
            } else {
                const cursor = await packageCollection.count(properties)
                resolve(cursor)
            }
        } catch (e) {
            reject(e)
        }
    })
}

module.exports = package

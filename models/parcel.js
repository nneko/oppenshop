const cfg = require('../configuration')
const db = require('../adapters/storage/' + cfg.dbAdapter)
const validator = require('../utilities/validator')
const debug = cfg.env == 'development' ? true : false
const warehouse = require('./warehouse')
const user = require('./user')

let parcel = {}

parcel.isValid = async (p) => {
    try {
        //If parcel is associated with a warehouse. Validate that warehouse exists
        let warehouseExists = null
        if (validator.isNotNull(p) && typeof (p.warehouse) !== 'undefined') {
            warehouseExists = await warehouse.read(p.warehouse, { findBy: 'id' })
            if (await warehouse.isValid(warehouseExists)) {
                warehouseExists = true
            } else {
                warehouseExists = false
            }
        }

        //If parcel is associated with a user. Validate that user exists
        let userExists = null
        if (validator.isNotNull(p) && typeof (p.owner) !== 'undefined') {
            userExists = await user.read(p.owner, { findBy: 'id' })
            if (await user.isValid(userExists)) {
                userExists = true
            } else {
                userExists = false
            }
        }

        if (warehouseExists && userExists && typeof (p.tracknum) == 'string' && validator.isNotNull(p.tracknum) && typeof (p.courier) == 'string' && validator.isNotNull(p.courier) && p.hasOwnProperty('invoices') && Array.isArray(p.invoices) && p.hasOwnProperty('declaredValue') && p.hasOwnProperty('declaredValueCurrency') && p.hasOwnProperty('serviceType') && p.hasOwnProperty('description')) {
            return true
        } else {
            return false
        }
    } catch (e) {
        console.error(e)
        throw e
    }
}

parcel.exists = async (p) => {
    try {
        const doc = await parcel.read(p, { limit: 1 })
        let result = await parcel.isValid(doc) ? true : false
        if (debug) {
            console.log('Checking parcel exits: ')
            console.log(p)
            console.log('parcel exists ' + result)
        }
        return result
    } catch (e) {
        if (debug) console.log(e)
        throw new Error('Unable to query database')
    }
}

parcel.create = (p) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!await parcel.isValid(p)) {
                let e = new Error('Invalid parcel object')
                e.name = 'parcelError'
                e.type = 'Invalid'
                throw e
            }

            if (await parcel.exists({ tracknum: p.tracknum.toLowerCase(), warehouse: p.warehouse, owner: p.owner })) {
                let e = new Error('parcel already exists')
                e.name = 'parcelError'
                e.type = 'Duplicate'
                throw e
            }

            p.tracknum = p.tracknum.toLowerCase()
            const result = await db.get().collection('parcels').insertOne(p)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

parcel.read = (properties, options) => {
    return new Promise(async (resolve, reject) => {
        try {
            const parcelCollection = db.get().collection('parcels')
            if (validator.isNotNull(options)) {
                if (typeof (options.limit) !== 'undefined') {
                    switch (options.limit) {
                        case 1:
                            const result = await parcelCollection.findOne(properties)
                            resolve(result)
                            break
                        default:
                            const cursor = await parcelCollection.find(properties).limit(options.limit)
                            resolve(cursor.toArray())
                            break
                    }
                } else if (typeof (options.findBy) !== 'undefined') {
                    switch (options.findBy) {
                        case 'id':
                            const result = await parcelCollection.findOne({ '_id': db.getObjectId(properties) })
                            resolve(result)
                            break
                        default:
                            const cursor = await parcelCollection.find(properties).limit(1)
                            resolve(cursor.toArray())
                            break
                    }
                } else if (typeof (options.pagination_skip) !== 'undefined') {
                    if (Number.isInteger(options.pagination_skip)) {
                        if (typeof (options.pagination_limit) !== 'undefined') {
                            if (Number.isInteger(options.pagination_skip)) {
                                const cursor = await parcelCollection.find(properties)
                                    .skip((options.pagination_limit * options.pagination_skip) - options.pagination_limit)
                                    .limit(options.pagination_limit)
                                resolve(cursor.toArray())
                            } else {
                                // TODO
                                console.log('parcel Model: Read - need to add condition.' + options.pagination_skip + ' ' + options.pagination_limit)
                            }
                        } else {
                            // TODO
                            console.log('parcel Model: Read - need to add condition.' + options.pagination_skip + ' ' + options.pagination_limit)
                        }
                    } else {
                        // TODO
                        console.log('parcel Model: Read - need to add condition.' + options.pagination_skip)
                    }
                    switch (options.findBy) {
                        case 'id':
                            const result = await parcelCollection.findOne({ '_id': db.getObjectId(properties) })
                            resolve(result)
                            break
                        default:
                            const cursor = await parcelCollection.find(properties)
                            resolve(cursor.toArray())
                            break
                    }
                } else {
                    let e = new Error('Invalid options to find operator')
                    e.name = 'parcelError'
                    e.type = 'Find Operation'
                    throw e
                }
            } else {
                const cursor = await parcelCollection.find(properties)
                resolve(cursor.toArray())
            }
        } catch (e) {
            reject(e)
        }
    })
}

parcel.update = (filters, values, options, operator) => {
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
                        let e = new Error('Invalid parcel operation')
                        e.name = 'parcelError'
                        e.type = 'Invalid Operation'
                        throw e
                    }
            }
            const parcelCollection = db.get().collection('parcels')
            let operation = {}
            if (validator.isNotNull(values) && typeof (values.name) == 'string') {
                values.name = values.name.toLowerCase()
            }
            operation[opr] = values
            const result = await parcelCollection.updateMany(filters, operation, options)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

parcel.delete = (filters) => {
    return new Promise(async (resolve, reject) => {
        try {
            const parcelCollection = db.get().collection('parcels')
            const result = await parcelCollection.deleteMany(filters)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

parcel.count = (properties, options) => {
    return new Promise(async (resolve, reject) => {
        try {
            const parcelCollection = db.get().collection('parcels')
            if (validator.isNotNull(options)) {
                if (typeof (options.limit) !== 'undefined') {
                    switch (options.limit) {
                        case 1:
                            const result = await parcelCollection.count(properties)
                            resolve(result)
                            break
                        default:
                            const cursor = await parcelCollection.count(properties).limit(options.limit)
                            resolve(cursor)
                            break
                    }
                } else if (typeof (options.findBy) !== 'undefined') {
                    switch (options.findBy) {
                        case 'id':
                            const result = await parcelCollection.count({ '_id': db.getObjectId(properties) })
                            resolve(result)
                            break
                        default:
                            const cursor = await parcelCollection.count(properties)
                            resolve(cursor)
                            break
                    }
                } else if (typeof (options.pagination_skip) !== 'undefined') {
                    if (Number.isInteger(options.pagination_skip)) {
                        if (typeof (options.pagination_limit) !== 'undefined') {
                            if (Number.isInteger(options.pagination_skip)) {
                                const cursor = await parcelCollection.count(properties)
                                //.skip((options.pagination_limit * options.pagination_skip) - options.pagination_limit)
                                //.limit(options.pagination_limit)
                                //resolve(cursor.toArray())
                                resolve(cursor)
                            } else {
                                // TODO
                                console.log('parcel Model: Count - need to add condition.' + options.pagination_skip + ' ' + options.pagination_limit)
                            }
                        } else {
                            // TODO
                            console.log('parcel Model: Count - need to add condition.' + options.pagination_skip + ' ' + options.pagination_limit)
                        }
                    } else {
                        // TODO
                        console.log('parcel Model: Count - need to add condition.' + options.pagination_skip)
                    }
                    switch (options.findBy) {
                        case 'id':
                            const result = await parcelCollection.count({ '_id': db.getObjectId(properties) })
                            resolve(result)
                            break
                        default:
                            const cursor = await parcelCollection.count(properties)
                            resolve(cursor)
                            break
                    }
                } else {
                    let e = new Error('Invalid options to find operator')
                    e.name = 'parcelError'
                    e.type = 'Find Operation'
                    throw e
                }
            } else {
                const cursor = await parcelCollection.count(properties)
                resolve(cursor)
            }
        } catch (e) {
            reject(e)
        }
    })
}

module.exports = parcel

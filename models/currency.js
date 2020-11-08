const cfg = require('../configuration')
const db = require('../adapters/storage/'+cfg.dbAdapter)
const validator = require('../utilities/validator')
const debug = cfg.env == 'development' ? true : false
const request = require('request')

//Model format based on:
//https://tools.ietf.org/html/draft-smarr-vcarddav-portable-contacts-00
let currency = {}

currency.isValid = (c) => {
    if (c && validator.isNotNull(c.code) && validator.isNotNull(c.symbol) && validator.isNotNull(c.status)){
        return true
    } else {
        return false
    }
}

currency.exists = async (c) => {
    try {
        const doc = await currency.read(c,{limit: 1})
        let result = currency.isValid(doc) ? true : false
        return result
    } catch (e) {
        if(debug) console.log(e)
        throw new Error('Unable to query database')
    }
}

currency.create = (c) => {
    return new Promise(async (resolve,reject) => {
        try {
            if(!currency.isValid(c)){
                let e = new Error('Invalid user object')
                e.name = 'CurrencyError'
                e.type = 'Invalid'
                throw e
            }

            if (await currency.exists({ code: c.code })) {
                let e = new Error('Currency already exists')
                e.name = 'CurrencyError'
                e.type = 'Duplicate'
                throw e
            }

            const result = await db.get().collection('currencies').insertOne(c)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

currency.read = (properties, options) => {
    return new Promise(async (resolve, reject) => {
        try {
            const currencyCollection = db.get().collection('currencies')
            if(validator.isNotNull(options)) {
                if(typeof(options.limit) !== 'undefined') {
                    switch(options.limit) {
                        case 1:
                            const result = await currencyCollection.findOne(properties)
                            resolve(result)
                            break
                        default:
                            const cursor = await currencyCollection.find(properties).limit(options.limit)
                            resolve(cursor.toArray())
                            break
                    }
                } else if(typeof(options.findBy) !== 'undefined') {
                    switch(options.findBy){
                        case 'id':
                            const result = await currencyCollection.findOne({'_id': db.getObjectId(properties)})
                            resolve(result)
                            break
                        default:
                            const cursor = await currencyCollection.find(properties).limit(1)
                            resolve(cursor.toArray())
                            break
                    }
                } else {
                    let e = new Error('Invalid options to find operator')
                    e.name = 'CurrencyError'
                    e.type = 'Find Operation'
                    throw e
                }
            } else {
                const cursor = await currencyCollection.find(properties)
                resolve(cursor.toArray())
            }
        } catch (e) {
            reject(e)
        }
    })
}

currency.update = (filters, values, options, operator) => {
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
                        let e = new Error('Invalid user operation')
                        e.name = 'CurrencyError'
                        e.type = 'Invalid Operation'
                        throw e
                    }
            }
            const currencyCollection = db.get().collection('currencies')
            let operation = {}
            operation[opr] = values
            const result = await currencyCollection.updateMany(filters,operation,options)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

currency.delete = (filters) => {
    return new Promise(async (resolve, reject) => {
        try {
            const currencyCollection = db.get().collection('currencies')
            const result = await currencyCollection.deleteMany(filters)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

module.exports = currency

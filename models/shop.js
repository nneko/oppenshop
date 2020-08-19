const cfg = require('../configuration')
const db = require('../adapters/storage/'+cfg.dbAdapter)
const validator = require('../utilities/validator')
const debug = cfg.env == 'development' ? true : false
const user = require('user')

let shop = {}

shop.isValid = async (s) => {
    try {
        let shopExists = await shop.exists({ _id: db.getObjectId(p.shop) })
        if (validator.isNotNull(p) && typeof (p.shop) == 'string' && shopExists && typeof (p.name) == 'string' && validator.isNotNull(p.name) && typeof (p.description) == 'string' && validator.isNotNull(p.description) && s.hasOwnProperty('address') && s.hasOwnProperty('phoneNumber') && p.hasOwnProperty('parentProduct')) {
            return true
        } else {
            return false
        }
    } catch (e) {
        console.error(e)
        throw e
    }
}

shop.exists = async (s) => {
    try {
        const result = validator.isNotNull(await shop.read(s,{limit: 1}))
        if(debug) {
            console.log('Checking shop exits: ')
            console.log(s)
            console.log('Shop exists ' + result)
        }
        return result
    } catch (e) {
        if(debug) console.log(e)
        throw new Error('Unable to query database')
    }
}

shop.create = (s) => {
    return new Promise(async (resolve,reject) => {
        try {
            if(!shop.isValid(s)){
                let e = new Error('Invalid shop object')
                e.name = 'ShopError'
                e.type = 'Invalid'
                throw e
            } 
            
            if (await shop.exists({ name: s.name })) {
                let e = new Error('Shop already exists')
                e.name = 'ShopError'
                e.type = 'Duplicate'
                throw e
            }

            s.name = s.name.toLowerCase()

            const result = await db.get().collection('shops').insertOne(s)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

shop.read = (properties, options) => {
    return new Promise(async (resolve, reject) => {
        try {
            const shopCollection = db.get().collection('shops')
            if(validator.isNotNull(options)) {
                if(typeof(options.limit) !== 'undefined') {
                    switch(options.limit) {
                        case 1:
                            const result = await shopCollection.findOne(properties)
                            resolve(result)
                            break
                        default:
                            const cursor = await shopCollection.find(properties).limit(options.limit)
                            resolve(cursor.toArray())
                            break
                    }
                } else if(typeof(options.findBy) !== 'undefined') {
                    switch(options.findBy){
                        case 'id':
                            const result = await shopCollection.findOne({'_id': db.getObjectId(properties)})
                            resolve(result)
                            break
                        default:
                            const cursor = await shopCollection.find(properties).limit(1)
                            resolve(cursor.toArray())
                            break
                    }
                } else {
                    let e = new Error('Invalid options to find operator')
                    e.name = 'ShopError'
                    e.type = 'Find Operation'
                    throw e
                }
            } else {
                const cursor = await shopCollection.find(properties)
                resolve(cursor.toArray())
            }
        } catch (e) {
            reject(e)
        }
    })
}

shop.update = (filters, values, options, operator) => {
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
                        let e = new Error('Invalid shop operation')
                        e.name = 'ShopError'
                        e.type = 'Invalid Operation'
                        throw e
                    }
            }
            const shopCollection = db.get().collection('shops')
            let operation = {}
            operation[opr] = values
            const result = await shopCollection.updateMany(filters,operation,options)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

shop.delete = (filters) => {
    return new Promise(async (resolve, reject) => {
        try {
            const shopCollection = db.get().collection('shops')
            const result = await shopCollection.deleteMany(filters)
            resolve(result)
        } catch (e) {
            reject(e)
        } 
    })
}

module.exports = shop
const cfg = require('../configuration')
const db = require('../adapters/storage/'+cfg.dbAdapter)
const validator = require('../utilities/validator')
const debug = cfg.env == 'development' ? true : false

//Model format based on:
//https://tools.ietf.org/html/draft-smarr-vcarddav-portable-contacts-00
let user = {}

user.isValid = (u) => {
    if (validator.isNotNull(u.preferredUsername) && validator.isNotNull(u.name) && validator.isNotNull(u.name.givenName) && validator.isNotNull(u.name.familyName) && validator.isNotNull(u.displayName) && validator.isNotNull(u.provider)){
        return true
    } else {
        return false
    }
}

user.exists = async (u) => {
    try {
        const result = validator.isNotNull(await user.read(u,{limit: 1}))
        if(debug) {
            console.log('Checking user exits: ')
            console.log(u)
            console.log('User exists ' + result)
        }
        return result
    } catch (e) {
        if(debug) console.log(e)
        throw new Error('Unable to query database')
    }
}

user.create = (u) => {
    return new Promise(async (resolve,reject) => {
        try {
            if(!user.isValid(u)){
                let e = new Error('Invalid user object')
                e.name = 'UserError'
                e.type = 'Invalid'
                throw e
            } 
            
            if (await user.exists({ preferredUsername: u.preferredUsername })) {
                let e = new Error('User already exists')
                e.name = 'UserError'
                e.type = 'Duplicate'
                throw e
            }

            const result = await db.get().collection('users').insertOne(u)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

user.read = (properties, options) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userCollection = db.get().collection('users')
            if(validator.isNotNull(options)) {
                if(typeof(options.limit) !== 'undefined') {
                    switch(options.limit) {
                        case 1:
                            const result = await userCollection.findOne(properties)
                            resolve(result)
                            break
                        default:
                            const cursor = await userCollection.find(properties).limit(options.limit)
                            resolve(cursor.toArray())
                            break
                    }
                } else if(typeof(options.findBy) !== 'undefined') {
                    switch(options.findBy){
                        case 'id':
                            const result = await userCollection.findOne({'_id': db.getObjectId(properties)})
                            resolve(result)
                            break
                        default:
                            const cursor = await userCollection.find(properties).limit(1)
                            resolve(cursor.toArray())
                            break
                    }
                } else {
                    let e = new Error('Invalid options to find operator')
                    e.name = 'UserError'
                    e.type = 'Find Operation'
                    throw e
                }
            } else {
                const cursor = await userCollection.find(properties)
                resolve(cursor.toArray())
            }
        } catch (e) {
            reject(e)
        }
    })
}

user.update = (filters, values, options, operator) => {
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
                        e.name = 'UserError'
                        e.type = 'Invalid Operation'
                        throw e
                    }
            }
            const userCollection = db.get().collection('users')
            let operation = {}
            operation[opr] = values
            const result = await userCollection.updateMany(filters,operation,options)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

user.delete = (filters) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userCollection = db.get().collection('users')
            const result = await userCollection.deleteMany(filters)
            resolve(result)
        } catch (e) {
            reject(e)
        } 
    })
}

module.exports = user
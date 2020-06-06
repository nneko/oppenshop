const cfg = require('../configure')
const db = require('../adapter/storage/'+cfg.dbAdapter)
const validator = require('../utility/validator')
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

            const result = await db.get().collection('user').insertOne(u)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

user.read = (properties, options) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userCollection = db.get().collection('user')
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
                }
                if(typeof(options.findBy) !== 'undefined') {
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

user.update = (filters, values, options) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userCollection = db.get().collection('user')
            const result = await userCollection.updateMany(filters,{$set: values},options)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

user.delete = (filters) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userCollection = db.get().collection('user')
            const result = await userCollection.deleteMany(filters)
            resolve(result)
        } catch (e) {
            reject(e)
        } 
    })
}

module.exports = user
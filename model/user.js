const cfg = require('../configure')
const db = require('./orm')
const validator = require('../utility/validator')
const debug = cfg.env == 'development' ? true : false

let user = {}

user.isValid = (u) => {
    if(validator.isNotNull(u.email) && validator.isNotNull(u.firstname) && validator.isNotNull(u.lastname)){
        return true
    } else {
        return false
    }
}

user.exists = async (u) => {
    try {
        const result = await user.read(u,{limit: 1})
        return result ? true : false
    } catch (e) {
        if(debug) console.log(e)
        throw new Error('Unable to query database')
    }
}

user.create = (u) => {
    return new Promise(async (resolve,reject) => {
        try {
            if(!user.isValid(u)){
                reject(new Error('Invalid user object'))
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
                if(options.limit){
                    switch (options.limit) {
                        case 1:
                            const result = await userCollection.findOne(properties)
                            resolve(result)
                            break;
                        default:
                            const cursor = await userCollection.find(properties).limit(options.limit)
                            resolve(cursor.toArray())
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
const cfg = require('../configuration')
const db = require('../adapters/storage/'+cfg.dbAdapter)
const validator = require('../utilities/validator')
const debug = cfg.env == 'development' ? true : false
const user = require('./user')

let permission = {}

permission.isValid = async (p) => {
    try {
        if (validator.isNotNull(p) && typeof(p.name) == 'string' && p.hasOwnProperty('status')) {
            return true
        } else {
            return false
        }
    } catch (e) {
        console.error(e)
        throw e
    }
}

permission.exists = async (p) => {
    try {
        const doc = await permission.read(p,{limit: 1})
        let result = await permission.isValid(doc) ? true : false
        if(debug) {
            console.log('Checking permission exits: ')
            console.log(r)
            console.log('permission exists ' + result)
        }
        return result
    } catch (e) {
        if(debug) console.log(e)
        throw new Error('Unable to query database')
    }
}

permission.create = (p) => {
    return new Promise(async (resolve,reject) => {
        try {
            if(!await permission.isValid(p)){
                let e = new Error('Invalid permission object')
                e.name = 'permissionError'
                e.type = 'Invalid'
                throw e
            }

            if (await permission.exists({ name: p.name.toLowerCase() })) {
                let e = new Error('permission already exists')
                e.name = 'permissionError'
                e.type = 'Duplicate'
                throw e
            }

            if (!validator.isNotNull(p.displayName)) p.displayName = p.name
            p.name = p.name.toLowerCase()

            const result = await db.get().collection('permissions').insertOne(p)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

permission.read = (properties, options) => {
    return new Promise(async (resolve, reject) => {
        try {
            const permissionCollection = db.get().collection('permissions')
            if(validator.isNotNull(options)) {
                if(typeof(options.limit) !== 'undefined') {
                    switch(options.limit) {
                        case 1:
                            const result = await permissionCollection.findOne(properties)
                            resolve(result)
                            break
                        default:
                            const cursor = await permissionCollection.find(properties).limit(options.limit)
                            resolve(cursor.toArray())
                            break
                    }
                } else if(typeof(options.findBy) !== 'undefined') {
                    switch(options.findBy){
                        case 'id':
                            const result = await permissionCollection.findOne({'_id': db.getObjectId(properties)})
                            resolve(result)
                            break
                        /*
                        case 'owner':
                            const ownerroles = await roleCollection.findOne({ owner: properties})
                            resolve(ownerroles)
                            break
                        */
                        default:
                            const cursor = await permissionCollection.find(properties).limit(1)
                            resolve(cursor.toArray())
                            break
                    }
                  } else if(typeof(options.pagination_skip) !== 'undefined') {
                      if (Number.isInteger(options.pagination_skip)) {
                        if (typeof(options.pagination_limit) !== 'undefined'){
                          if (Number.isInteger(options.pagination_skip)) {
                            const cursor = await permissionCollection.find(properties)
                                                              .skip((options.pagination_limit * options.pagination_skip) - options.pagination_limit)
                                                              .limit(options.pagination_limit)
                            resolve(cursor.toArray())
                          } else {
                            // TODO
                            console.log('permission Model: Read - need to add condition.'+options.pagination_skip+' '+options.pagination_limit)
                          }
                        } else {
                          // TODO
                          console.log('permission Model: Read - need to add condition.'+options.pagination_skip+' '+options.pagination_limit)
                        }
                      } else {
                        // TODO
                        console.log('permission Model: Read - need to add condition.'+options.pagination_skip)
                      }
                      switch(options.findBy){
                          case 'id':
                              const result = await permissionCollection.findOne({'_id': db.getObjectId(properties)})
                              resolve(result)
                              break
                          /*
                          case 'owner':
                              const ownerroles = await roleCollection.findOne({ owner: properties})
                              resolve(ownerroles)
                              break
                          */
                          default:
                              const cursor = await permissionCollection.find(properties).limit(1)
                              resolve(cursor.toArray())
                              break
                      }
                  } else {
                    let e = new Error('Invalid options to find operator')
                    e.name = 'permissionError'
                    e.type = 'Find Operation'
                    throw e
                }
            } else {
                const cursor = await permissionCollection.find(properties)
                resolve(cursor.toArray())
            }
        } catch (e) {
            reject(e)
        }
    })
}

permission.update = (filters, values, options, operator) => {
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
                        let e = new Error('Invalid permission operation')
                        e.name = 'permissionError'
                        e.type = 'Invalid Operation'
                        throw e
                    }
            }
            const permissionCollection = db.get().collection('permissions')
            let operation = {}
            if(validator.isNotNull(values) && typeof(values.name) == 'string') {
                values.name = values.name.toLowerCase()
            }
            operation[opr] = values
            const result = await permissionCollection.updateMany(filters,operation,options)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

permission.delete = (filters) => {
    return new Promise(async (resolve, reject) => {
        try {
            const permissionCollection = db.get().collection('permissions')
            const result = await permissionCollection.deleteMany(filters)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

permission.count = (properties, options) => {
    return new Promise(async (resolve, reject) => {
        try {
            const permissionCollection = db.get().collection('permissions')
            if(validator.isNotNull(options)) {
                if(typeof(options.limit) !== 'undefined') {
                    switch(options.limit) {
                        case 1:
                            const result = await permissionCollection.count(properties)
                            resolve(result)
                            break
                        default:
                            const cursor = await permissionCollection.count(properties).limit(options.limit)
                            resolve(cursor.toArray())
                            break
                    }
                } else if(typeof(options.findBy) !== 'undefined') {
                    switch(options.findBy){
                        case 'id':
                            const result = await permissionCollection.count({'_id': db.getObjectId(properties)})
                            resolve(result)
                            break
                        /*
                        case 'owner':
                            const ownerroles = await permissionCollection.count({ owner: properties})
                            resolve(ownerroles)
                            break
                        */
                        default:
                            const cursor = await permissionCollection.count(properties).limit(1)
                            resolve(cursor.toArray())
                            break
                    }
                  } else if(typeof(options.pagination_skip) !== 'undefined') {
                      if (Number.isInteger(options.pagination_skip)) {
                        if (typeof(options.pagination_limit) !== 'undefined'){
                          if (Number.isInteger(options.pagination_skip)) {
                            const cursor = await permissionCollection.count(properties)
                                                              //.skip((options.pagination_limit * options.pagination_skip) - options.pagination_limit)
                                                              //.limit(options.pagination_limit)
                            //resolve(cursor.toArray())
                            resolve(cursor)
                          } else {
                            // TODO
                            console.log('permission Model: Count - need to add condition.'+options.pagination_skip+' '+options.pagination_limit)
                          }
                        } else {
                          // TODO
                          console.log('permission Model: Count - need to add condition.'+options.pagination_skip+' '+options.pagination_limit)
                        }
                      } else {
                        // TODO
                        console.log('permission Model: Count - need to add condition.'+options.pagination_skip)
                      }
                      switch(options.findBy){
                          case 'id':
                              const result = await permissionCollection.count({'_id': db.getObjectId(properties)})
                              resolve(result)
                              break
                          /*
                          case 'owner':
                              const ownerroles = await permissionCollection.count({ owner: properties})
                              resolve(ownerroles)
                              break
                          */
                          default:
                              const cursor = await permissionCollection.count(properties).limit(1)
                              resolve(cursor.toArray())
                              break
                      }
                  } else {
                    let e = new Error('Invalid options to find operator')
                    e.name = 'permissionError'
                    e.type = 'Find Operation'
                    throw e
                }
            } else {
                const cursor = await permissionCollection.count(properties)
                resolve(cursor.toArray())
            }
        } catch (e) {
            reject(e)
        }
    })
}

module.exports = permission

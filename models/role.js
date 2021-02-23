const cfg = require('../configuration')
const db = require('../adapters/storage/'+cfg.dbAdapter)
const validator = require('../utilities/validator')
const debug = cfg.env == 'development' ? true : false
const user = require('./user')

let role = {}

role.isValid = async (r) => {
    try {
        if (validator.isNotNull(r) && typeof(r.name) == 'string' && r.hasOwnProperty('status')) {
            return true
        } else {
            return false
        }
    } catch (e) {
        console.error(e)
        throw e
    }
}

role.exists = async (r) => {
    try {
        const doc = await role.read(r,{limit: 1})
        let result = await role.isValid(doc) ? true : false
        if(debug) {
            console.log('Checking role exits: ')
            console.log(r)
            console.log('role exists ' + result)
        }
        return result
    } catch (e) {
        if(debug) console.log(e)
        throw new Error('Unable to query database')
    }
}

role.create = (r) => {
    return new Promise(async (resolve,reject) => {
        try {
            if(!await role.isValid(r)){
                let e = new Error('Invalid role object')
                e.name = 'roleError'
                e.type = 'Invalid'
                throw e
            }

            if (await role.exists({ name: r.name.toLowerCase() })) {
                let e = new Error('role already exists')
                e.name = 'roleError'
                e.type = 'Duplicate'
                throw e
            }

            if (!validator.isNotNull(r.displayName)) r.displayName = r.name
            r.name = r.name.toLowerCase()

            const result = await db.get().collection('roles').insertOne(r)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

role.read = (properties, options) => {
    return new Promise(async (resolve, reject) => {
        try {
            const roleCollection = db.get().collection('roles')
            if(validator.isNotNull(options)) {
                if(typeof(options.limit) !== 'undefined') {
                    switch(options.limit) {
                        case 1:
                            const result = await roleCollection.findOne(properties)
                            resolve(result)
                            break
                        default:
                            const cursor = await roleCollection.find(properties).limit(options.limit)
                            resolve(cursor.toArray())
                            break
                    }
                } else if(typeof(options.findBy) !== 'undefined') {
                    switch(options.findBy){
                        case 'id':
                            const result = await roleCollection.findOne({'_id': db.getObjectId(properties)})
                            resolve(result)
                            break
                        /*
                        case 'owner':
                            const ownerroles = await roleCollection.findOne({ owner: properties})
                            resolve(ownerroles)
                            break
                        */
                        default:
                            const cursor = await roleCollection.find(properties).limit(1)
                            resolve(cursor.toArray())
                            break
                    }
                  } else if(typeof(options.pagination_skip) !== 'undefined') {
                      if (Number.isInteger(options.pagination_skip)) {
                        if (typeof(options.pagination_limit) !== 'undefined'){
                          if (Number.isInteger(options.pagination_skip)) {
                            const cursor = await roleCollection.find(properties)
                                                              .skip((options.pagination_limit * options.pagination_skip) - options.pagination_limit)
                                                              .limit(options.pagination_limit)
                            resolve(cursor.toArray())
                          } else {
                            // TODO
                            console.log('role Model: Read - need to add condition.'+options.pagination_skip+' '+options.pagination_limit)
                          }
                        } else {
                          // TODO
                          console.log('role Model: Read - need to add condition.'+options.pagination_skip+' '+options.pagination_limit)
                        }
                      } else {
                        // TODO
                        console.log('role Model: Read - need to add condition.'+options.pagination_skip)
                      }
                      switch(options.findBy){
                          case 'id':
                              const result = await roleCollection.findOne({'_id': db.getObjectId(properties)})
                              resolve(result)
                              break
                          /*
                          case 'owner':
                              const ownerroles = await roleCollection.findOne({ owner: properties})
                              resolve(ownerroles)
                              break
                          */
                          default:
                              const cursor = await roleCollection.find(properties).limit(1)
                              resolve(cursor.toArray())
                              break
                      }
                  } else {
                    let e = new Error('Invalid options to find operator')
                    e.name = 'roleError'
                    e.type = 'Find Operation'
                    throw e
                }
            } else {
                const cursor = await roleCollection.find(properties)
                resolve(cursor.toArray())
            }
        } catch (e) {
            reject(e)
        }
    })
}

role.update = (filters, values, options, operator) => {
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
                        let e = new Error('Invalid role operation')
                        e.name = 'roleError'
                        e.type = 'Invalid Operation'
                        throw e
                    }
            }
            const roleCollection = db.get().collection('roles')
            let operation = {}
            if(validator.isNotNull(values) && typeof(values.name) == 'string') {
                values.name = values.name.toLowerCase()
            }
            operation[opr] = values
            const result = await roleCollection.updateMany(filters,operation,options)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

role.delete = (filters) => {
    return new Promise(async (resolve, reject) => {
        try {
            const roleCollection = db.get().collection('roles')
            const result = await roleCollection.deleteMany(filters)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

role.count = (properties, options) => {
    return new Promise(async (resolve, reject) => {
        try {
            const roleCollection = db.get().collection('roles')
            if(validator.isNotNull(options)) {
                if(typeof(options.limit) !== 'undefined') {
                    switch(options.limit) {
                        case 1:
                            const result = await roleCollection.count(properties)
                            resolve(result)
                            break
                        default:
                            const cursor = await roleCollection.count(properties).limit(options.limit)
                            resolve(cursor.toArray())
                            break
                    }
                } else if(typeof(options.findBy) !== 'undefined') {
                    switch(options.findBy){
                        case 'id':
                            const result = await roleCollection.count({'_id': db.getObjectId(properties)})
                            resolve(result)
                            break
                        /*
                        case 'owner':
                            const ownerroles = await roleCollection.count({ owner: properties})
                            resolve(ownerroles)
                            break
                        */
                        default:
                            const cursor = await roleCollection.count(properties).limit(1)
                            resolve(cursor.toArray())
                            break
                    }
                  } else if(typeof(options.pagination_skip) !== 'undefined') {
                      if (Number.isInteger(options.pagination_skip)) {
                        if (typeof(options.pagination_limit) !== 'undefined'){
                          if (Number.isInteger(options.pagination_skip)) {
                            const cursor = await roleCollection.count(properties)
                                                              //.skip((options.pagination_limit * options.pagination_skip) - options.pagination_limit)
                                                              //.limit(options.pagination_limit)
                            //resolve(cursor.toArray())
                            resolve(cursor)
                          } else {
                            // TODO
                            console.log('role Model: Count - need to add condition.'+options.pagination_skip+' '+options.pagination_limit)
                          }
                        } else {
                          // TODO
                          console.log('role Model: Count - need to add condition.'+options.pagination_skip+' '+options.pagination_limit)
                        }
                      } else {
                        // TODO
                        console.log('role Model: Count - need to add condition.'+options.pagination_skip)
                      }
                      switch(options.findBy){
                          case 'id':
                              const result = await roleCollection.count({'_id': db.getObjectId(properties)})
                              resolve(result)
                              break
                          /*
                          case 'owner':
                              const ownerroles = await roleCollection.count({ owner: properties})
                              resolve(ownerroles)
                              break
                          */
                          default:
                              const cursor = await roleCollection.count(properties).limit(1)
                              resolve(cursor.toArray())
                              break
                      }
                  } else {
                    let e = new Error('Invalid options to find operator')
                    e.name = 'roleError'
                    e.type = 'Find Operation'
                    throw e
                }
            } else {
                const cursor = await roleCollection.count(properties)
                resolve(cursor.toArray())
            }
        } catch (e) {
            reject(e)
        }
    })
}

module.exports = role

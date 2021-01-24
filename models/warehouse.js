const cfg = require('../configuration')
const db = require('../adapters/storage/'+cfg.dbAdapter)
const validator = require('../utilities/validator')
const debug = cfg.env == 'development' ? true : false
const user = require('./user')

let warehouse = {}

warehouse.isValid = async (w) => {
    try {
        let ownerExists = null
        if (validator.isNotNull(w) && typeof (w.owner) == 'string') {
            ownerExists = await user.read(w.owner, { findBy: 'id' })
            if (await user.isValid(ownerExists)) {
                ownerExists = true
            } else {
                ownerExists = false
            }
        }
        if (ownerExists && typeof(w.name) == 'string' && w.hasOwnProperty('staff') && w.hasOwnProperty('status')) {
            return true
        } else {
            return false
        }
    } catch (e) {
        console.error(e)
        throw e
    }
}

warehouse.exists = async (w) => {
    try {
        const doc = await warehouse.read(w,{limit: 1})
        let result = await warehouse.isValid(doc) ? true : false
        if(debug) {
            console.log('Checking warehouse exits: ')
            console.log(w)
            console.log('warehouse exists ' + result)
        }
        return result
    } catch (e) {
        if(debug) console.log(e)
        throw new Error('Unable to query database')
    }
}

warehouse.create = (w) => {
    return new Promise(async (resolve,reject) => {
        try {
            if(!await warehouse.isValid(w)){
                let e = new Error('Invalid warehouse object')
                e.name = 'warehouseError'
                e.type = 'Invalid'
                throw e
            }

            if (await warehouse.exists({ name: w.name.toLowerCase() })) {
                let e = new Error('warehouse already exists')
                e.name = 'warehouseError'
                e.type = 'Duplicate'
                throw e
            }

            if (!validator.isNotNull(w.displayName)) w.displayName = w.name
            w.name = w.name.toLowerCase()

            const result = await db.get().collection('warehouses').insertOne(w)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

warehouse.read = (properties, options) => {
    return new Promise(async (resolve, reject) => {
        try {
            const warehouseCollection = db.get().collection('warehouses')
            if(validator.isNotNull(options)) {
                if(typeof(options.limit) !== 'undefined') {
                    switch(options.limit) {
                        case 1:
                            const result = await warehouseCollection.findOne(properties)
                            resolve(result)
                            break
                        default:
                            const cursor = await warehouseCollection.find(properties).limit(options.limit)
                            resolve(cursor.toArray())
                            break
                    }
                } else if(typeof(options.findBy) !== 'undefined') {
                    switch(options.findBy){
                        case 'id':
                            const result = await warehouseCollection.findOne({'_id': db.getObjectId(properties)})
                            resolve(result)
                            break
                        case 'owner':
                            const ownerwarehouses = await warehouseCollection.findOne({ owner: properties})
                            resolve(ownerwarehouses)
                            break
                        default:
                            const cursor = await warehouseCollection.find(properties).limit(1)
                            resolve(cursor.toArray())
                            break
                    }
                  } else if(typeof(options.pagination_skip) !== 'undefined') {
                      if (Number.isInteger(options.pagination_skip)) {
                        if (typeof(options.pagination_limit) !== 'undefined'){
                          if (Number.isInteger(options.pagination_skip)) {
                            const cursor = await warehouseCollection.find(properties)
                                                              .skip((options.pagination_limit * options.pagination_skip) - options.pagination_limit)
                                                              .limit(options.pagination_limit)
                            resolve(cursor.toArray())
                          } else {
                            // TODO
                            console.log('warehouse Model: Read - need to add condition.'+options.pagination_skip+' '+options.pagination_limit)
                          }
                        } else {
                          // TODO
                          console.log('warehouse Model: Read - need to add condition.'+options.pagination_skip+' '+options.pagination_limit)
                        }
                      } else {
                        // TODO
                        console.log('warehouse Model: Read - need to add condition.'+options.pagination_skip)
                      }
                      switch(options.findBy){
                          case 'id':
                              const result = await warehouseCollection.findOne({'_id': db.getObjectId(properties)})
                              resolve(result)
                              break
                          case 'owner':
                              const ownerwarehouses = await warehouseCollection.findOne({ owner: properties})
                              resolve(ownerwarehouses)
                              break
                          default:
                              const cursor = await warehouseCollection.find(properties).limit(1)
                              resolve(cursor.toArray())
                              break
                      }
                  } else {
                    let e = new Error('Invalid options to find operator')
                    e.name = 'warehouseError'
                    e.type = 'Find Operation'
                    throw e
                }
            } else {
                const cursor = await warehouseCollection.find(properties)
                resolve(cursor.toArray())
            }
        } catch (e) {
            reject(e)
        }
    })
}

warehouse.update = (filters, values, options, operator) => {
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
                        let e = new Error('Invalid warehouse operation')
                        e.name = 'warehouseError'
                        e.type = 'Invalid Operation'
                        throw e
                    }
            }
            const warehouseCollection = db.get().collection('warehouses')
            let operation = {}
            if(validator.isNotNull(values) && typeof(values.name) == 'string') {
                values.name = values.name.toLowerCase()
            }
            operation[opr] = values
            const result = await warehouseCollection.updateMany(filters,operation,options)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

warehouse.delete = (filters) => {
    return new Promise(async (resolve, reject) => {
        try {
            const warehouseCollection = db.get().collection('warehouses')
            const result = await warehouseCollection.deleteMany(filters)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

warehouse.count = (properties, options) => {
    return new Promise(async (resolve, reject) => {
        try {
            const warehouseCollection = db.get().collection('warehouses')
            if(validator.isNotNull(options)) {
                if(typeof(options.limit) !== 'undefined') {
                    switch(options.limit) {
                        case 1:
                            const result = await warehouseCollection.count(properties)
                            resolve(result)
                            break
                        default:
                            const cursor = await warehouseCollection.count(properties).limit(options.limit)
                            resolve(cursor.toArray())
                            break
                    }
                } else if(typeof(options.findBy) !== 'undefined') {
                    switch(options.findBy){
                        case 'id':
                            const result = await warehouseCollection.count({'_id': db.getObjectId(properties)})
                            resolve(result)
                            break
                        case 'owner':
                            const ownerwarehouses = await warehouseCollection.count({ owner: properties})
                            resolve(ownerwarehouses)
                            break
                        default:
                            const cursor = await warehouseCollection.count(properties).limit(1)
                            resolve(cursor.toArray())
                            break
                    }
                  } else if(typeof(options.pagination_skip) !== 'undefined') {
                      if (Number.isInteger(options.pagination_skip)) {
                        if (typeof(options.pagination_limit) !== 'undefined'){
                          if (Number.isInteger(options.pagination_skip)) {
                            const cursor = await warehouseCollection.count(properties)
                                                              //.skip((options.pagination_limit * options.pagination_skip) - options.pagination_limit)
                                                              //.limit(options.pagination_limit)
                            //resolve(cursor.toArray())
                            resolve(cursor)
                          } else {
                            // TODO
                            console.log('warehouse Model: Count - need to add condition.'+options.pagination_skip+' '+options.pagination_limit)
                          }
                        } else {
                          // TODO
                          console.log('warehouse Model: Count - need to add condition.'+options.pagination_skip+' '+options.pagination_limit)
                        }
                      } else {
                        // TODO
                        console.log('warehouse Model: Count - need to add condition.'+options.pagination_skip)
                      }
                      switch(options.findBy){
                          case 'id':
                              const result = await warehouseCollection.count({'_id': db.getObjectId(properties)})
                              resolve(result)
                              break
                          case 'owner':
                              const ownerwarehouses = await warehouseCollection.count({ owner: properties})
                              resolve(ownerwarehouses)
                              break
                          default:
                              const cursor = await warehouseCollection.count(properties).limit(1)
                              resolve(cursor.toArray())
                              break
                      }
                  } else {
                    let e = new Error('Invalid options to find operator')
                    e.name = 'warehouseError'
                    e.type = 'Find Operation'
                    throw e
                }
            } else {
                const cursor = await warehouseCollection.count(properties)
                resolve(cursor.toArray())
            }
        } catch (e) {
            reject(e)
        }
    })
}

module.exports = warehouse

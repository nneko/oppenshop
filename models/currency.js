const cfg = require('../configuration')
const db = require('../adapters/storage/'+cfg.dbAdapter)
const validator = require('../utilities/validator')
const debug = cfg.env == 'development' ? true : false
const request = require('request')

//Model format based on:
//https://tools.ietf.org/html/draft-smarr-vcarddav-portable-contacts-00
let currency = {}

currency.isValid = (c) => {
    if (validator.isNotNull(c.code) && validator.isNotNull(c.symbol) && validator.isNotNull(c.status)){
        return true
    } else {
        return false
    }
}

currency.exists = async (c) => {
    try {
        const result = validator.isNotNull(await currency.read(c,{limit: 1}))
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
            const userCollection = db.get().collection('currencies')
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
                    e.name = 'CurrencyError'
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
            const userCollection = db.get().collection('currencies')
            let operation = {}
            operation[opr] = values
            const result = await userCollection.updateMany(filters,operation,options)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

currency.delete = (filters) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userCollection = db.get().collection('currencies')
            const result = await userCollection.deleteMany(filters)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

currency.update_currency_conversion_rate = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const userCollection = db.get().collection('currencies')
            const cursor = await userCollection.find({'status': 'active'})
            const tmp = await cursor.toArray()

            resolve(tmp)
        } catch (e) {
            reject(e)
        }
    }).then(async (value) => {
      //console.log(4)
      //console.log(value)
      let p = []
      for (const v of value) {
        p.push(new Promise(async resolve => {
          //console.log('call before')
          //console.log('call end')
          //setTimeout(() => resolve(pull_live_currency_rates()), 10)
          let fx = {}
          request('https://openexchangerates.org/api/latest.json?app_id='+cfg.openExchangeRatesAppID, function (error, response, body) {
            if (error){
              return fx
            }
            fx = JSON.parse(body)
            //console.log(body)
            //console.log({rates: fx.rates, base: fx.base, updated:fx.timestamp})
            //console.log('leave')
            //return fx
            resolve({rates: fx.rates, base: fx.base, updated:fx.timestamp})

          })
        }).then((f) => {
          //console.log(f)
          c = v
          c.exchangeBase = f.base
          c.exchangeRates = f.rates
          c.updated = new Date().toISOString()
          c.updated_timestamp = f.updated
          //console.log(c)
          return
        }).then((x2) => {
          //const data = new Promise(resolve => currency.update({'_id':c._id},c))
          return new Promise(async resolve => {
            let data = await currency.update({'_id':c._id},c)
            resolve(data)
          }).then((d2) => {
            //console.log('ModifiedCount:'+ d2.modifiedCount)
            //console.log(d2)
            return d2.modifiedCount
          })
        }))
      }
      return Promise.all(p).then(values => {
        //console.log(values); // [3, 1337, "foo"]
        if(values.every((currentValue) => currentValue == 1)){
          return true
        } else {
          return false
        }
      }).then(async (v2) => {
      //console.log(v2)
      return v2

    })
  })
}

let pull_live_currency_rates = async () => {
  // http://openexchangerates.github.io/money.js/
  console.log('enter')
  let fx = {}
  request('https://openexchangerates.org/api/latest.json?app_id='+cfg.openExchangeRatesAppID, function (error, response, body) {
    if (error){
      return fx
    }
    fx.rates = body.rates
    fx.base = body.base
    //console.log(body)
    console.log({rates: body.rates, base: body.base})
    console.log('leave')
    //return fx
    return {rates: body.rates, base: body.base}

  })
}

module.exports = currency

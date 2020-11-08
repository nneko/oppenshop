const cfg = require('../configuration')
const db = require('../adapters/storage/' + cfg.dbAdapter)
const validator = require('../utilities/validator')
const debug = cfg.env == 'development' ? true : false
const request = require('request-promise')

let fx = {}

fx.isValid = (f) => {
    if (f && validator.isNotNull(f.exchangeBase) && typeof(f.exchangeBase) == 'string' && validator.isNotNull(f.exchangeRates) && typeof(f.exchangeRates) == 'object' && validator.isNotNull(f.source)) {
        return true
    } else {
        return false
    }
}

fx.exists = async (f) => {
    try {
        const doc = await fx.read(f, { limit: 1 })
        let result = fx.isValid(doc) ? true : false
        return result
    } catch (e) {
        if (debug) console.log(e)
        throw new Error('Unable to query database')
    }
}

fx.create = (f) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!fx.isValid(f)) {
                let e = new Error('Invalid user object')
                e.name = 'fxError'
                e.type = 'Invalid'
                throw e
            }

            if (await fx.exists({ source: f.source })) {
                let e = new Error('fx already exists')
                e.name = 'fxError'
                e.type = 'Duplicate'
                throw e
            }

            const result = await db.get().collection('fx').insertOne(c)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

fx.read = (properties, options) => {
    return new Promise(async (resolve, reject) => {
        try {
            const fxCollection = db.get().collection('fx')
            if (validator.isNotNull(options)) {
                if (typeof (options.limit) !== 'undefined') {
                    switch (options.limit) {
                        case 1:
                            const result = await fxCollection.findOne(properties)
                            resolve(result)
                            break
                        default:
                            const cursor = await fxCollection.find(properties).limit(options.limit)
                            resolve(cursor.toArray())
                            break
                    }
                } else if (typeof (options.findBy) !== 'undefined') {
                    switch (options.findBy) {
                        case 'id':
                            const result = await fxCollection.findOne({ '_id': db.getObjectId(properties) })
                            resolve(result)
                            break
                        default:
                            const cursor = await fxCollection.find(properties).limit(1)
                            resolve(cursor.toArray())
                            break
                    }
                } else {
                    let e = new Error('Invalid options to find operator')
                    e.name = 'fxError'
                    e.type = 'Find Operation'
                    throw e
                }
            } else {
                const cursor = await fxCollection.find(properties)
                resolve(cursor.toArray())
            }
        } catch (e) {
            reject(e)
        }
    })
}

fx.update = (filters, values, options, operator) => {
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
                        let e = new Error('Invalid user operation')
                        e.name = 'fxError'
                        e.type = 'Invalid Operation'
                        throw e
                    }
            }
            const fxCollection = db.get().collection('fx')
            let operation = {}
            operation[opr] = values
            const result = await fxCollection.updateMany(filters, operation, options)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

fx.delete = (filters) => {
    return new Promise(async (resolve, reject) => {
        try {
            const fxCollection = db.get().collection('fx')
            const result = await fxCollection.deleteMany(filters)
            resolve(result)
        } catch (e) {
            reject(e)
        }
    })
}

fx.updateRates = (source, rates) => {
    return new Promise(async (resolve, reject) => {
        try {
            const ex = await fx.read({source: source}, {limit: 1})
            if(fx.isValid(ex)) {
                switch(source) {
                    case 'openexchangerates.org':
                        let x = {}
                        let resp = await fxAPIRequest('https://openexchangerates.org/api/latest.json?app_id=' + cfg.openExchangeRatesAppID)
                        if(resp && resp.base && resp.rates && resp.timestamp) {
                            x.exchangeRates = resp.rates
                            x.exchangeBase = resp.base
                            x.updated = new Date().toISOString()
                            x.updated_timestamp = resp.timestamp
                        }
                        resolve(await fx.update({source: source},x))
                        break
                    default:
                        resolve(await fx.update({source: source},{exchangeRates: rates}))
                }
            } else {
                let fxError = new Error('No valid fx for source: ' + source)
                fxError.name = 'fxError'
                fxError.type = 'Invalid Source'
                reject(fxError)
            }
        } catch (e) {
            reject(e)
        }
    })
}

function fxAPIRequest(url) {
    return new Promise((resolve, reject) => {
        try {
            // select correct request module depending on whether the protocol is http or https in the url
            const request = url.startsWith('https') ? require('https') : require('http')

            const req = request.get(url, { headers: 'application/json' }, (res) => {
                // process any non http success codes indicating errors
                if (res.statusCode < 200 || res.statusCode > 299) {
                    reject(new Error('Error on fx api request, status code: ' + res.statusCode));
                }

                res.setEncoding('utf-8');

                // Temporary data buffer
                let data = '';
                let dataDecoder = new StringDecoder('utf-8')

                // Append every data chunk to the temporary buffer
                res.on('data', (chunk) => data += dataDecoder.write(chunk))

                // Once end of response detected resolve promise with data object
                res.on('end', () => {
                    resolve(JSON.parse(data))
                })
            });

            // handle connection errors of the request
            request.on('error', (err) => reject(err))
        } catch (e) {
            reject(e)
        }
    })
}

module.exports = fx

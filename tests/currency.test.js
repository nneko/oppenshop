const currency = require('../models/currency')

const cfg = require('../configuration')
const { MongoMemoryServer } = require('mongodb-memory-server')
const {MongoClient} = require('mongodb')
const t = require('./memory_mongodb_server_model')

let c1 = {
    code: 'JMD',
    symbol: '$',
    status: 'active',
    description: 'Jamaican Dollar'
}

let c2 = {
    code: 'USD',
    symbol: '$',
    status: 'active',
    description: 'United States Dollar'
}


let mongod
let connection
let db

describe('user create object returns object', () => {

  beforeAll(async () => {
    mongod = new MongoMemoryServer()
    const uri = await mongod.getUri()
    const port = await mongod.getPort();
    const dbPath = await mongod.getDbPath();
    const dbName = await mongod.getDbName();
    connection = await MongoClient.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    //console.log(eval(connection))
    db = await connection.db(dbName)
    t.set(db)

  })

  afterAll(async () => {
    await connection.close()
    //await db.close()
    await mongod.stop()
    done()
  })

  it('should insert a new currency(JMD) into collection currencies', async () => {
    let item = {insertedCount: 1}
    const data = await currency.create(c1);
    c1._id = data.insertedId
    //console.log(typeof(data))
    //console.log(data)
    //expect(user.create(u)).resolves.toEqual(expect.objectContaining(item))
    expect(data).toEqual(expect.objectContaining(item))
  })

  it('should insert a new currency(USD) into collection currencies', async () => {
    let item = {insertedCount: 1}
    const data = await currency.create(c2);
    c2._id = data.insertedId
    //console.log(typeof(data))
    //console.log(data)
    //expect(user.create(u)).resolves.toEqual(expect.objectContaining(item))
    expect(data).toEqual(expect.objectContaining(item))
  })

  it('should update all currencies exchangeRates in collection currencies', async () => {
    let item = true
    //console.log(cfg.openExchangeRatesAppID)
    const data = await currency.update_currency_conversion_rate();
    //console.log(data)
    //expect(user.create(u)).resolves.toEqual(expect.objectContaining(item))
    expect(data).toBe(item)
  })

})

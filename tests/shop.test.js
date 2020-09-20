const user = require('../models/user')
const shop = require('../models/shop')
const generator = require('../utilities/generator')
const bcrypt = require('bcryptjs')
const cfg = require('../configuration')
//const db = require('../adapters/storage/'+cfg.dbAdapter)
const { MongoMemoryServer } = require('mongodb-memory-server')
//const db = require('../adapters/storage/'+cfg.dbAdapter)
const {MongoClient} = require('mongodb')
const t = require('./memory_mongodb_server_model')
//const mongod = new MongoMemoryServer()
//const pwHash = await bcrypt.hash(String('password'), 10)

let v_Token = generator.randomString(32)
let n = {
    givenName: 'John',
    familyName: 'Brown'
}
let u = {
  preferredUsername: 'tester@test.com',
  provider: 'native',
  name: n,
  displayName: n.givenName + ' ' + n.familyName,
  //password: pwHash,
  verificationToken: v_Token,
  verified: false,
  emails: [
    {
      value:'tester@test.com',
      primary: true
    }
  ],
  phoneNumbers: [],
  addresses: []

}
let s = {}
let mongod
let connection
let db

describe('shop create object returns object', () => {
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
    db = await connection.db(dbName)
    t.set(db)

  })

  afterAll(async () => {
    await connection.close()
    //await db.close()
    await mongod.stop()
    done()
  })

  it('should insert a new user into collection user', async () => {
    const pwHash = await bcrypt.hash(String('password'), 10)
    u.password = pwHash
    let item = {insertedCount: 1}
    const data = await user.create(u);
    u._id = data.insertedId
    expect(data).toEqual(expect.objectContaining(item))
  })

  it('should insert a new shop into collection shop', async () => {
    let item = {insertedCount: 1}
    let sh = {
      owner: u._id.toString(),
      name: 'Beta Shop',
      displayName: 'Beta Shopping',
      status: 'active'
    }
    //console.log(sh)
    const data = await shop.create(sh);
    sh._id = data.insertedId
    s = sh
    expect(data).toEqual(expect.objectContaining(item))
  })

  it('should update existing shop into collection shop', async () => {
    let item = {modifiedCount: 1}
    let addr = {
        type:  "home",
        streetAddress: '10 Long Way',
        locality: 'Kingston',
        region: 'St. Andrew',
        postalCode: '00000',
        country: 'Jamaica',
        formatted: generator.formattedAddress({
          streetAddress: '10 Long Way',
          locality: 'Kingston',
          region: 'St. Andrew',
          postalCode: '00000',
          country: 'Jamaica'}),
        primary: true
    }
    s.addresses = [addr]
    //console.log(s)
    const data = await shop.update({ _id: s._id},s);
    expect(data).toEqual(expect.objectContaining(item))
  })

  // Deletion shop
  it('should delete shop from collection shop', async () => {
    let item = {deletedCount: 1}
    //let d = await shop.read({_id: s._id})
    //console.log(d)
    const data = await shop.delete({_id: s._id})
    expect(data).toEqual(expect.objectContaining(item))
  })

  // Deletion user
  it('should delete user from collection user', async () => {
    let item = {deletedCount: 1}
    const data = await user.delete({preferredUsername: u.preferredUsername})
    expect(data).toEqual(expect.objectContaining(item))
  })

})

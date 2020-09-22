const user = require('../models/user')
const shop = require('../models/shop')
const product = require('../models/product')
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
let s = {
  //owner: u._id.toString(),
  name: 'Beta Shop',
  displayName: 'Beta Shopping',
  status: 'active',
  addresses: [
    {
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
  ]
}
let p = {}
let image_alpha = {
  fieldimage: 'fullimage',
  originalname: 'image_alpha.png',
  encoding: '7bit',
  mimetype: 'image/png',
  //buffer: new Binary(),
  size: 2715822,
  storage: 'db'
}
let spec_alpha = {
  Height: '100 cm',
  Weight: '100 lbs',
  Width: '20 cm',
  Length: '15 cm'
}
let mongod
let connection
let db

describe('product create object returns object', () => {
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
    s.owner = u._id.toString()
    //console.log(s)
    const data = await shop.create(s);
    s._id = data.insertedId
    expect(data).toEqual(expect.objectContaining(item))
  })

  it('should insert a new product into collection product', async () => {
    let item = {insertedCount: 1}
    let pr = {
      shop: s._id.toString(),
      name: 'Beta Product',
      description: 'Beta description ...',
      displayName: 'Beta Products',
      status: 'active',
      quantity:  0,
      price: generator.roundNumber( 0, 2),
      currency: 'jmd',
      images: [image_alpha],
      specifications: [spec_alpha]

    }
    //s.owner = u._id
    //console.log(pr)
    const data = await product.create(pr);
    pr._id = data.insertedId
    p = pr
    expect(data).toEqual(expect.objectContaining(item))
  })

  // Deletion product
  it('should delete product from collection product', async () => {
    let item = {deletedCount: 1}
    //let d = await shop.read({_id: s._id})
    //console.log(d)
    const data = await product.delete({_id: p._id})
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

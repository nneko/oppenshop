const user = require('../models/user')
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
let mongod
let connection
let db


//test('user create object returns object', () => {
describe('user create object returns object', () => {

  //let connection
  //let db

  beforeAll(async () => {
    mongod = new MongoMemoryServer()
    const uri = await mongod.getUri()
    const port = await mongod.getPort();
    const dbPath = await mongod.getDbPath();
    const dbName = await mongod.getDbName();
    /*
    console.log(uri)
    console.log(port)
    console.log(dbPath)
    console.log(dbName)
    */
    connection = await MongoClient.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    //console.log(eval(connection))
    db = await connection.db(dbName)
    t.set(db)
    /*
    console.log(eval(db))
    console.log(process.env.NODE_ENV)
    //let tmp = await db.collection('users').insertOne(u)
    //console.log(tmp)

    console.log('after connect')
    */
  })

  afterAll(async () => {
    await connection.close()
    //await db.close()
    await mongod.stop()
    done()
  })


  /*
  it('...', async () => {
    const User = MongoClient.model('User', new MongoClient.Schema({ name: String }));
    const count = await User.count();
    expect(count).toEqual(0);
  })
  */

  it('should insert a new user into collection user', async () => {
    const pwHash = await bcrypt.hash(String('password'), 10)
    u.password = pwHash
    let item = {insertedCount: 1}
    //let item = {addCount: 1}
    const data = await user.create(u);
    u._id = data.insertedId
    //console.log(typeof(data))
    //console.log(data)
    //expect(user.create(u)).resolves.toEqual(expect.objectContaining(item))
    expect(data).toEqual(expect.objectContaining(item))
  })

  it('should update user phone(primary) into collection user', async () => {
    let item = {modifiedCount: 1}
    let primaryPhone  = {
        value: '8765551234',
        type: "other",
        primary: true
    }
    //u.phoneNumbers = removePrimaryFields(u.phoneNumbers)
    u.phoneNumbers.push(primaryPhone)
    //let item = {addCount: 1}
    const data = await user.update({ preferredUsername: u.preferredUsername },u);
    //u._id = data.insertedId
    //console.log(typeof(data))
    //console.log(data)
    //expect(user.create(u)).resolves.toEqual(expect.objectContaining(item))
    expect(data).toEqual(expect.objectContaining(item))
  })

  it('should update user address(primary) into collection user', async () => {
    let item = {modifiedCount: 1}
    let primaryAddr = {
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
    //u.addresses = removePrimaryFields(u.addresses)
    u.addresses.push(primaryAddr)
    //let item = {addCount: 1}
    const data = await user.update({ preferredUsername: u.preferredUsername },u);
    //u._id = data.insertedId
    //console.log(typeof(data))
    //console.log(data)
    //expect(user.create(u)).resolves.toEqual(expect.objectContaining(item))
    expect(data).toEqual(expect.objectContaining(item))
  })

  it('should update user emails(add another) into collection user', async () => {
    let item = {modifiedCount: 1}
    let email  = {
        value:'testing@test.com'
    }
    //u.phoneNumbers = removePrimaryFields(u.phoneNumbers)
    u.emails.push(email)
    //let item = {addCount: 1}
    const data = await user.update({ preferredUsername: u.preferredUsername },u);
    //u._id = data.insertedId
    //console.log(typeof(data))
    //console.log(data)
    //expect(user.create(u)).resolves.toEqual(expect.objectContaining(item))
    expect(data).toEqual(expect.objectContaining(item))
  })

  it('should update user phoneNumber(add another) into collection user', async () => {
    let item = {modifiedCount: 1}
    let phone  = {
        value:'6585551234'
    }
    //u.phoneNumbers = removePrimaryFields(u.phoneNumbers)
    u.phoneNumbers.push(phone)
    //let item = {addCount: 1}
    const data = await user.update({ preferredUsername: u.preferredUsername },u);
    //u._id = data.insertedId
    //console.log(typeof(data))
    //console.log(data)
    //expect(user.create(u)).resolves.toEqual(expect.objectContaining(item))
    expect(data).toEqual(expect.objectContaining(item))
  })

  // Delete email address
  it('should delete user email(s) into collection user', async () => {
    let item = {modifiedCount: 1}
    let uu = {}
    // Read existing stored user details
    const usr = await user.read(u._id, { findBy: 'id' })
    uu.preferredUsername = usr.preferredUsername
    uu.emails = generator.removeFields(usr.emails, u.emails[1].value)
    const data = await user.update({ preferredUsername: u.preferredUsername }, uu)
    expect(data).toEqual(expect.objectContaining(item))
  })
  // Delete phone number
  it('should delete user phoneNumber(s) into collection user', async () => {
    let item = {modifiedCount: 1}
    let uu = {}
    // Read existing stored user details
    const usr = await user.read(u._id, { findBy: 'id' })
    uu.preferredUsername = usr.preferredUsername
    uu.phoneNumbers = generator.removeFields(usr.phoneNumbers, u.phoneNumbers[1].value)
    const data = await user.update({ preferredUsername: u.preferredUsername }, uu)
    expect(data).toEqual(expect.objectContaining(item))
  })
  // Deletion user
  it('should delete user from collection user', async () => {
    let item = {deletedCount: 1}
    const data = await user.delete({preferredUsername: u.preferredUsername})
    expect(data).toEqual(expect.objectContaining(item))
  })

})

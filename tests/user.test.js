const user = require('../models/user')
const generator = require('../utilities/generator')
const bcrypt = require('bcryptjs')
const cfg = require('../configuration')
const { MongoMemoryServer } = require('mongodb-memory-server')
//const db = require('../adapters/storage/'+cfg.dbAdapter)
const {MongoClient} = require('mongodb')
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
  verified: false

}
let mongod
let connection
let db
/*
beforeAll(async () => {
  mongod = new MongoMemoryServer()
  const uri = await mongod.getUri()
  console.log(uri)
  connection = await MongoClient.connect(uri, {
  //db = await MongoClient.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  db = await connection.db()
})

afterAll(async () => {
  await connection.close()
  //await db.close()
  await db.disconnect()
  await mongod.stop()
})
*/
//test('user create object returns object', () => {
describe('user create object returns object', () => {

  let connection
  let db

  beforeAll(async () => {
    //connection = await MongoClient.connect(global.__MONGO_URI__, {
    //  useNewUrlParser: true,
    //})
    //db = await connection.db(global.__MONGO_DB_NAME__)

    //connection = await MongoClient.connect(process.env.MONGO_URL, {
    //  useNewUrlParser: true,
    //  useUnifiedTopology: true
    //})
    //db = await connection.db()
    mongod = new MongoMemoryServer()
    const uri = await mongod.getUri()
    const port = await mongod.getPort();
    const dbPath = await mongod.getDbPath();
    const dbName = await mongod.getDbName();
    console.log(uri)
    console.log(port)
    console.log(dbPath)
    console.log(dbName)
    connection = await MongoClient.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    console.log(eval(connection))
    db = await connection.db(dbName)
    console.log(eval(db))
    //db = Object.assign(db,{get: async function(){return await connection.db('jest')}})
    //db.get(async() => {return await connection.db('jest')})
    //db.get() = async function () {
    //  return await connection.db('jest')
    //}
  })

  afterAll(async () => {
    await connection.close()
    await db.close()
    await mongod.stop()
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
    let item = {addCount: 1}
    expect(user.create(u)).toContainEqual(item)
  })
})

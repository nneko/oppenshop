const cfg = require('../../configure')
const dbType = cfg.dbType
const dbDriver = require(String(dbType))
const dbHost = cfg.dbHost
const dbPort = cfg.dbPort
const dbName = cfg.database
const dbUser = cfg.dbUser
const dbPwd = cfg.dbPwd
const dbAuthSource = cfg.dbAuthSource
const dbURI = dbType + '://' + dbHost + ':' + dbPort.toString() + '/'
const debug = cfg.env == 'development' ? true : false

let database = {}

let dbClient = dbType !== 'mongodb' ? false : dbDriver.MongoClient(dbURI, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    authSource: dbAuthSource,
    auth: {
        user: dbUser,
        password: dbPwd 
    }
})

let dbo = false

database.getObjectId = (id) => {
    return dbDriver.ObjectID(id)
}

database.connect = () => {
    return new Promise(async (resolve, reject) => {
        try {
            if (debug) console.log('Connecting to database at uri: ' + dbURI)
            await dbClient.connect()
            dbo = dbClient.db(dbName)
            if (!dbo) throw new Error('Unable to connect to database: ' + dbName); else resolve(dbo)
        } catch (e) {
            reject(e)
        }
    })
}

database.get = () => dbo

database.close = () => {
    return new Promise(async (resolve, reject) => {
        try {
            await dbClient.close()
            if(debug) console.log('Closed database connection.')
            resolve()
        } catch (e) {
            if (debug) console.log('Unable to close database connection.')
            reject(e)
        }
    })
}

module.exports = database
const cfg = require('../configure')
const dbType = cfg.dbType
const dbDriver = require(String(dbType))
const dbHost = cfg.dbHost
const dbPort = cfg.dbPort
const dbName = cfg.database
const dbURL = dbType+'://'+dbHost+':'+dbPort.toString()+'/'
const dbClient = dbType !== 'mongodb' ? false : dbDriver.MongoClient(dbURL, {
    useUnifiedTopology: true,
    useNewUrlParser: true
})
const assert = require('assert')
const validator = require('../utility/validator')

if(!validator.isNotNull(dbClient)){
    throw(new Error('Could not create database client with driver: '+dbDriver))
}

let user = {}

user.isValid = (u) => {
    if(validator.isNotNull(u.email) && validator.isNotNull(u.firstname) && validator.isNotNull(u.lastname)){
        return true
    } else {
        return false
    }
}

user.exists = (u) => {
    try {

    } catch (e) {

    }
    
    return false 
}

user.create = (u, callback) => {
    let result = false
    if(dbClient){
        try {
            if(!user.isValid(u)){
                throw new Error('Invalid user object')
            }
            dbClient.connect((er) =>{
                if(er) throw er
                const db = dbClient.db(dbName)
                const users = db.collection('user')
                users.insertOne(u,(err, r) => {
                    if(err) {
                        throw err
                    } else {
                        result = r
                        dbClient.close()
                        if(callback) callback(result)
                    }
                })
            })
        } catch (e) {
            throw e
        }
    } else {
        throw new Error('No database client')
    } 
}

user.read = () => {
    if (dbClient) {
        try {

            dbClient.connect((err) => {
                assert.equal(null, err)
                const db = dbClient.db(dbName)
            })
        } catch (e) {

        } finally {
            dbClient.close()
        }
    } else {
        throw new Error('No database client')
    } 
}

user.update = () => {
    if (dbClient) {
        try {

            dbClient.connect((err) => {
                assert.equal(null, err)
                const db = dbClient.db(dbName)
            })
        } catch (e) {

        } finally {
            dbClient.close()
        }
    } else {
        throw new Error('No database client')
    } 
}

user.delete = () => {
    if (dbClient) {
        try {

            dbClient.connect((err) => {
                assert.equal(null, err)
                const db = dbClient.db(dbName)
            })
        } catch (e) {

        } finally {
            dbClient.close()
        }
    } else {
        throw new Error('No database client')
    } 
}

module.exports = user
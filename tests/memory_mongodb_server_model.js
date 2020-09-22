let db = null
let t = {}

t.get = () => db

t.set = (mms) => {db = mms}

t.close = () => {
    return new Promise(async (resolve, reject) => {
        try {
            await db.close()
            if(debug) console.log('Closed database connection.')
            resolve()
        } catch (e) {
            if (debug) console.log('Unable to close database connection.')
            reject(e)
        }
    })
}

module.exports = t

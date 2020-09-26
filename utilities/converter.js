/*
 * Converts objects to different types
 *
 */

let converter = {}

converter.objectFieldsToString = (obj) => {
    let o = {}
    for(const k of Object.keys(obj)){
        let new_key = String(k).trim()

        //Replace unsupported characters (mongodb driver does not support keys starting with $ or keys containing '.')
        new_key = new_key.split('.').join('')

        if(new_key.startsWith('$')) {
            new_key = new_key.substr(1, new_key.length)
        }
        
        o[new_key] = String(obj[k]).trim()
    }

    return o
}

module.exports = converter
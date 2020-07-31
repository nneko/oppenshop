/*
 * Converts objects to different types
 *
 */

let converter = {}

converter.objectFieldsToString = (obj) => {
    let o = {}
    for(const k of Object.keys(obj)){
        o[k] = String(obj[k])
    }

    return o
}

module.exports = converter
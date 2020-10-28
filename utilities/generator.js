/*
 * Generates values for various tasks
 *
 */

// Dependencies
const cfg = require('../configuration')
const crypto = require('crypto')
const https = require('https')
const querystring = require('querystring')
const { v4: uuidv4 } = require('uuid')
const validator = require('./validator')

//Secret Key used in Hashing
let secretKey = cfg.secret

// Container for all the helpers
let generator = {}

// Parse a JSON string to an object in all cases, without throwing
generator.parseJsonToObject = function (str) {
    try {
        let obj = JSON.parse(str)
        return obj
    } catch (e) {
        return {}
    }
}

// Create a SHA256 hash
generator.hash = function (str, salt) {
    if (typeof (str) == 'string' && str.length > 0) {
        if (typeof (salt) == 'string' && salt.length > 0) {
            let hash = crypto.createHmac('sha256', salt).update(str).digest('hex')
            return hash
        } else {
            let hash = crypto.createHmac('sha256', secretKey).update(str).digest('hex')
            return hash
        }
    } else {
        return false
    }
}

generator.salt = function (str) {
    if (typeof (str) == 'string' && str.length > 0) {
        let salt = generator.hash(secretKey + str)
        return salt
    } else {
        return false
    }
}

generator.uuid = function () {
    return uuidv4()
}

generator.uuidv4 = function () {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
}

// Create a string of random alphanumeric characters, of a given length
generator.randomString = function (strLength) {
    strLength = typeof (strLength) == 'number' && strLength > 0 ? strLength : false;
    if (strLength) {
        // Define all the possible characters that could go into a string
        var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789'

        // Start the final string
        var str = ''
        for (i = 1; i <= strLength; i++) {
            // Get a random charactert from the possibleCharacters string
            var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length))
            // Append this character to the string
            str += randomCharacter
        }
        // Return the final string
        return str
    } else {
        return false
    }
}

generator.MIMEType = function (extension) {
    let mimetype = 'application/octet-stream'
    switch (extension) {
        case '.json':
            mimetype = 'application/json'
            break
        case '.html':
            mimetype = 'text/html'
            break
        case '.css':
            mimetype = 'text/css'
            break
        case '.csv':
            mimetype = 'text/csv'
            break
        case '.txt':
            mimetype = 'text/plain'
            break
        case '.js':
            mimetype = 'text/javascript'
            break
        case '.jpg':
        case '.jpeg':
            mimetype = 'image/jpeg'
            break
        case '.png':
            mimetype = 'image/png'
            break
        case '.bmp':
            mimetype = 'image/bmp'
            break
        case '.gif':
            mimetype = 'image/gif'
            break
        case '.svg':
            mimetype = 'image/svg+xml'
            break
        case '.tiff':
        case '.tif':
            mimetype = 'image/tiff'
            break
        case '.webp':
            mimetype = 'image/webp'
            break
        default:
            mimetype = 'application/json'
    }
    return mimetype
}

generator.formattedAddress = (addr) => {
    let addressString = ''
    console.log(addr)
    if(addr) {
        let streetAddress = addr.streetAddress
        let secondStreetAddress = addr.secondStreetAddress
        let locality = addr.locality
        let region = addr.region
        let postalCode = addr.postalCode
        let country = addr.country
        if(streetAddress && locality && region && postalCode && country) {
            if (validator.isNotNull(secondStreetAddress)) {
              addressString += addressString.concat(streetAddress + '\n' + secondStreetAddress + '\n' + locality + ', ' + region + ' ' + postalCode + ' ' + country)
            } else {
              addressString += addressString.concat(streetAddress + '\n' + locality + ', ' + region + ' ' + postalCode + ' ' + country)
            }
        }
    }
    return addressString
}

generator.getField = (list, val) => {
    let field = null

    if (validator.isNotNull(list)) {
        for (let i = 0; i < list.length; i++) {
            let e = list[i]
            if (e && e.value == val) {
                field = e
                break
            }
        }
    }
    return field
}

generator.getPrimaryField = (list) => {
    let field = null

    if (validator.isNotNull(list)) {
        for (let i = 0; i < list.length; i++) {
            let e = list[i]
            let p = undefined
            for (const k of Object.keys(e)) {
                if (k == 'primary') {
                    p = e
                    break
                }
            }
            if (p) {
                field = p
                break
            }
        }
    }
    return field
}

generator.getPrimaryFieldIndex = (list) => {
    let field = 0

    if (validator.isNotNull(list)) {
        for (let i = 0; i < list.length; i++) {
            let e = list[i]
            let p = undefined
            for (const k of Object.keys(e)) {
                if (k == 'primary') {
                    p = e
                    break
                }
            }
            if (p) {
                field = i
                break
            }
        }
    }
    return field
}

generator.removePrimaryFields = (list) => {
    let new_list = list

    if (validator.isNotNull(new_list)) {
        for (let i = 0; i < new_list.length; i++) {
            let e = new_list[i]
            for (const k of Object.keys(e)) {
                if (k == 'primary') delete e[k]
            }
        }
    }
    return new_list
}

generator.removeFields = (list, val) => {
    let new_list = []

    if (validator.isNotNull(list)) {
        for (let i = 0; i < list.length; i++) {
            let e = list[i]
            if (validator.isNotNull(e.value) && e.value != val) {
                new_list.push(e)
            }
        }
    }
    return new_list
}

generator.removeAddressFields = (list, addr) => {
    let new_list = []

    if (validator.isNotNull(list) && validator.isAddress(addr)) {
        for (let i = 0; i < list.length; i++) {
            let e = list[i]
            if (!validator.isAddressMatch(e, addr)) {
                new_list.push(e)
            }
        }
    } else {
        return list
    }

    return new_list
}

generator.roundNumber = (value, decimals) => {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals).toFixed(decimals);
}

// Export the module
module.exports = generator

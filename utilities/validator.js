/*
 * Validates whether an object "is" something or "has" some property
 * All methods return a boolean
 *
 */
let validator = {}

validator.isNotNull = (obj) => {
    return ((obj && obj !== 'null' && obj !== 'undefined') ? true : false)
}

validator.isEmpty = (obj) => {
    if(!validator.isNotNull(obj)) {
        return true
    } else {
        if(Array.isArray(obj) && obj.length == 0) {
            return true
        } else {
            return false
        }
    }
}

validator.isPhoneNumber = (phone) => {
    return typeof(phone) === 'string' && phone != '' ? true : false
}

validator.isAddress = (addr) => {
    let isValid = false
    if(validator.isNotNull(addr)) {
        if(addr.hasOwnProperty('streetAddress') && addr.hasOwnProperty('locality') && addr.hasOwnProperty('region') && addr.hasOwnProperty('postalCode') && addr.hasOwnProperty('country')) isValid = true
    }

    return isValid
}

validator.isAddressMatch = (addr1, addr2) => {
    if(validator.isAddress(addr1) && validator.isAddress(addr2)){
        return ((addr1.streetAddress === addr2.streetAddress) && (addr1.locality === addr2.locality) && (addr1.region === addr2.region) && (addr1.postalCode === addr2.postalCode) && (addr1.country === addr2.country))
    } else {
        return false
    }
}

validator.isEmailAddress = (email) => {
    // Email format definition based on RFC822 / RFC2822  
    // Compliant regex as provided by https://html.spec.whatwg.org/multipage/input.html#e-mail-state-(type=email)
    const emailRE = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

    return emailRE.test(email)
}

validator.isAuthProvider = (provider) => {
    let isProvider = false
    switch(provider){
        case 'native':
            isProvider = true
            break        
    }
    return isProvider
}

validator.hasActiveSession = (r) => {
    if(r.session && r.user){
        if(r.session.passport) {
            return (r.session.passport.user == r.user.id)
        }
    }
    return false
}

validator.isLocalUserAccount = (u) => {
    if(validator.isNotNull(u)){
        return u.provider == 'native' ? true : false
    }
    return false
}

module.exports = validator
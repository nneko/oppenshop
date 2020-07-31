/*
 * Validates whether an object "is" something or "has" some property
 * All methods return a boolean
 *
 */
let validator = {}

validator.isNotNull = (obj) => {
    return ((obj && obj !== 'null' && obj !== 'undefined') ? true : false)
}

validator.isPhoneNumber = (phone) => {
    return typeof(phone) === 'string' ? true : false
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
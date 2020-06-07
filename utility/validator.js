let validator = {}

validator.isNotNull = (obj) => {
    return ((obj && obj !== 'null' && obj !== 'undefined') ? true : false)
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

module.exports = validator
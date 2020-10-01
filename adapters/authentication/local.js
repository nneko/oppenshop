const cfg = require('../../configuration')
const authStrategy = require('passport-local').Strategy
const debug = cfg.env == 'development' ? true : false
const bcrypt = require('bcryptjs')
const validator = require('../../utilities/validator')

let model = false
let local = {}

local.init = (passport,userModel) => {
    if(!validator.isNotNull(userModel)) throw new Error('Invalid user model')
    model = userModel
    passport.use(new authStrategy({usernameField: 'username'},local.authenticate))
    passport.serializeUser(local.serialize)
    passport.deserializeUser(local.deserialize)
}

local.authenticate = async (uid, pwd, done) => {
    try {
        if(!model) throw new Error('Unable complete authentication. Cannot access local user database.')
        const user = await model.read({preferredUsername: uid},{limit: 1})
        
        if(validator.isNotNull(user)) {
            let isVerified = user.verified

            let verificationRequired = validator.isNotNull(cfg.verifyUsers) ? cfg.verifyUsers : false;

            if (verificationRequired && (!isVerified)) {
                return done(null, false, { message: 'Account verification required.' })
            }

            if((!validator.isNotNull(user.password)) || (!validator.isNotNull(pwd))) {
                return done(null, false, { message: 'Invalid password.' })
            }

            if(await  bcrypt.compare(pwd,user.password)){
                //Extract only relevant user details
                let u = {}
                u.id = user._id
                u.provider = user.provider
                u.displayName = user.displayName
                u.name = user.name
                if (validator.isNotNull(user.emails)) {
                    u.emails = {}
                    for (const k of Object.keys(user.emails)) {
                        if (user.emails[k].primary) {
                            u.emails[k] = user.emails[k]
                            break
                        }
                    }
                }
                if (validator.isNotNull(user.photos)) {
                    u.photos = {}
                    for(const k of Object.keys(user.photos)) {
                        if(user.photos[k].primary) {
                            u.photos[k] = user.photos[k]
                            break
                        }
                    }
                }
                if(validator.isNotNull(user.roles)) u.roles = user.roles
                return done(null,u)
            } else {
                return done(null,false,{message: 'Incorrect password.'})                
            }
        } else {
            return done(null, false, {message: 'User does not exist.'})
        }
    } catch(e) {
        return done(e)
    }
}

local.serialize = (user,done) => {
    return done(null,user.id)
}

local.deserialize = async (uid,done) => {
    try {
        const user = await model.read(uid, { findBy: 'id' })
        //Extract only relevant user details
        let u = {}
        u.id = user._id
        u.provider = user.provider
        u.displayName = user.displayName
        u.name = user.name
        if (validator.isNotNull(user.emails)) {
            u.emails = {}
            for (const k of Object.keys(user.emails)) {
                if (user.emails[k].primary) {
                    u.emails[k] = user.emails[k]
                    break
                }
            }
        }
        if (validator.isNotNull(user.photos)) {
            u.photos = {}
            for (const k of Object.keys(user.photos)) {
                if (user.photos[k].primary) {
                    u.photos[k] = user.photos[k]
                    break
                }
            }
        }

        if (validator.isNotNull(user.roles)) u.roles = user.roles
    return done(null, u)
    } catch(e) {
        return done(e)
    }
}

module.exports = local
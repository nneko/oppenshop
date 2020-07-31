const cfg = require('../../configuration')
const authStrategy = require('passport-local').Strategy
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
const debug = cfg.env == 'development' ? true : false
const bcrypt = require('bcryptjs')
const validator = require('../../utilities/validator')

let model = false
let google = {}

google.init = (passport,userModel) => {
    if(!validator.isNotNull(userModel)) throw new Error('Invalid user model')
    model = userModel
    //passport.use(new authStrategy({usernameField: 'username'},local.authenticate))
    passport.use(new GoogleStrategy({
            clientID: cfg.googleClientID,
            clientSecret: cfg.googleClientSecret,
            callbackURL: cfg.endpoint+"auth/google/signin"
          },google.authenticate
        ))
    passport.serializeUser(google.serialize)
    passport.deserializeUser(google.deserialize)
}

//google.authenticate = async (uid, pwd, done) => {
google.authenticate = async (accessToken, refreshToken, profile, done) => {
    console.log(profile)
    try {
        if(!model) throw new Error('Unable complete authentication. Model() not configured.')

        const user = await model.read({preferredUsername: profile._json.email},{limit: 1})
        /*
        * Validate if a profile already exists for the user. If one exists ensure that the provider is 'google'. Otherwise is no profile exists create one with google as the provider.
        * If a profile already exists but is not provided by google then fail to authorize and throw error.
        */
        if(validator.isNotNull(user)) {
            //Skip verification flag checks since google oauth service already verifies user identity

            //Validate that user provide is google.
            if(user.provider != 'google') {
                return done(null, false, { message: 'Authentication failed. Cannot signin with google for previously created local account.' })
            }

            //Since provider is google populate session with relevant user data
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
            return done(null,u)
        } else {
            let u = profile
            u.preferredUsername = profile._json.email
            delete u.id
            delete u._raw
            delete u._json
            const result = await model.create(u)
            const user = await model.read({preferredUsername: u.preferredUsername},{limit: 1})
            u.id = user._id
            return done(null,u)
        }
    } catch(e) {
        return done(e)
    }
}

google.serialize = (user,done) => {
    return done(null,user.id)
}

google.deserialize = async (uid,done) => {
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
    return done(null, u)
    } catch(e) {
        return done(e)
    }
}

module.exports = google

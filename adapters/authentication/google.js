const cfg = require('../../configuration')
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
const debug = cfg.env == 'development' ? true : false
const validator = require('../../utilities/validator')
const generator = require('../../utilities/generator')

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
    try {
        if(!model) throw new Error('Unable complete authentication. Model() not configured.')

        const user = await model.read({preferredUsername: profile._json.email},{limit: 1})
        /*
        * Validate if a profile already exists for the user. If one exists ensure that the provider is 'google'. Otherwise is no profile exists create one with google as the provider.
        * If a profile already exists but is not provided by google then fail to authorize and throw error.
        */
        if(validator.isNotNull(user)) {

            //Validate that user provide is google.
            if(user.provider != 'google') {
                return done(null, false, { message: 'Authentication failed. Cannot signin with google for previously created local account.' })
            }

            //Verification checks
            let isVerified = user.verified

            let verificationRequired = validator.isNotNull(cfg.verifyUsers) ? cfg.verifyUsers : false;

            if (verificationRequired && (!isVerified)) {
                return done(null, false, { message: 'Account verification required.' })
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
            let new_profile = profile
            new_profile.preferredUsername = profile._json.email
            profile._json.email_verified ? new_profile.verified = true : new_profile.verified = false;
            if(!new_profile.verified){
                new_profile.verificationToken = generator.randomString(32)
            }
            let primaryEmailSet = false
            for(i=0;i<new_profile.emails.length;i++){
                if(new_profile.emails[i].value == new_profile._json.email) {
                    new_profile.emails[i].primary = true
                    primaryEmailSet = true
                    break
                }
            }
            delete new_profile.id
            delete new_profile._raw
            delete new_profile._json
            //Persist user profile
            await model.create(new_profile)
            
            //Load user data
            const user = await model.read({preferredUsername: new_profile.preferredUsername},{limit: 1})

            //Extract only relevant user details for storage in session
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

const cfg = require('../../configure')
const authStrategy = require('passport-local').Strategy
const debug = cfg.env == 'development' ? true : false
const bcrypt = require('bcryptjs')
const validator = require('../../utility/validator')

let model = false
let local = {}

local.init = (passport,userModel) => {
    if(!validator.isNotNull(userModel)) throw new Error('Invalid user model')
    model = userModel
    passport.use(new authStrategy({usernameField: 'email'},local.authenticate))
    passport.serializeUser(local.serialize)
    passport.deserializeUser(local.deserialize)
}

local.authenticate = async (uid, pwd, done) => {
    try {
        if(!model) throw new Error('Unable complete authentication. Cannot access local user database.')
        const user = await model.read({email: uid},{limit: 1})
        if(validator.isNotNull(user)) {
            if(await  bcrypt.compare(pwd,user.password)){
                return done(null,user)
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
    /*
    return done(null, JSON.stringify({provider: 'oppenshop', id: user._id, name: {givenName: user.firstname, familyName: user.lastname},emails: [{value: user.email, type: 'primary'}]}))*/
    if(debug) console.log(user._id)
    return done(null,user._id)
}

local.deserialize = async (uid,done) => {
    /*
    const u = JSON.parse(serializedUser,{limit: 1})
    const usr = await model.read({_id: u.id, firstname: u.givenName, lastname: u.familyName, email: u.emails[0].value})
    return done(null, usr)
    */
   const u = await model.read(uid,{findBy: 'id'})
   return done(null, u)
}

module.exports = local
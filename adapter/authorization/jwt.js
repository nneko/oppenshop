const cfg = require('../../configure')
const passport = require('passport')
const passportJWT = require('passport-jwt')
const JWTStrategy = passportJWT.Strategy
const JWTExtract = passportJWT.ExtractJwt
const validator = require('../../utility/validator')
const JWT = require('jsonwebtoken')
const debug = cfg.env == 'development' ? true : false

let model = false
let jwt = {}

jwt.init = () => {
    passport.use(new JWTStrategy({
        jwtFromRequest: JWTExtract.fromAuthHeaderAsBearerToken(),
        secretOrKey: cfg.accessTokenSecret
    }, (jwtPayload, callback) => {
        if(debug) {
            console.log('Extracted token data: ')
            console.log(jwtPayload)
        }
        try {
            return callback(null,jwtPayload)
        } catch(e) {
            return callback(e)
        }
    }))
}

jwt.authenticateTokenFromHeader = (req,res,next) => {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]
    if(validator.isNotNull(token)) {
        JWT.verify(token, cfg.accessTokenSecret, (err, user) => {
            if(err) {
                return next(403)
            }

             req.user = user
             next() 
        })
    } else {
        return next(401)
    }
}

jwt.authenticateTokenFromSession = (req, res, next) => {
    console.log(req.cookies)
    const token = validator.isNotNull(req.cookies) ? req.cookies.token : validator.isNotNull(req.session) ? req.session.token : undefined
    if(debug) console.log('Access Token: ' + token)
    if (validator.isNotNull(token)) {
        JWT.verify(token, cfg.accessTokenSecret, (err, user) => {
            if (err) {
                res.status(403)
                next()
                return
            }

            req.user = user
            next()
        })
    } else {
        res.status(401)
        next()
        return
    }
}

module.exports = jwt
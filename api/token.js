const cfg = require('../configuration/index.js')
const express = require('express')
const passport = require('passport')
const tkn = require('jsonwebtoken')
const tokenGrantSecret = cfg.accessTokenSecret
const tokenRefreshSecret = cfg.refreshTokenSecret
const validator = require('../utilities/validator')
const authAdapters = require('../adapters/authentication')

let token = express.Router()

token.post('/', (req, res) => {
    if (validator.isNotNull(req.body.username) && validator.isNotNull(req.body.password) && validator.isNotNull(req.body.provider)) {
        try {
            let authProvider = validator.isNotNull(authAdapters[req.body.provider]) ? authAdapters[req.body.provider] : authAdapters.native
            passport.authenticate(authProvider, { session: false }, (err, user, info) => {
                if(err) throw(err)
                
                if(user) {
                    req.login(user, (err) => {
                        const accessToken = tkn.sign(user, tokenGrantSecret)
                        res.json({ token: accessToken })
                        return
                    })
                } else {
                    res.status(401)
                    res.json({error: 'Unauthorized'})
                    return
                }
            })(req,res)
        } catch(e) {
            res.status(500)
            res.json({error: 'Could not process request'})
            throw e
        }
    } else {
        res.status(400)
        res.json({error: 'Bad Request'})
    }
})

token.use((req, res) => {
    res.status(405)
    res.json({ error: 'Method Not Allowed' })
})

module.exports = token
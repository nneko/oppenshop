const cfg = require('../configuration/index.js')
const express = require('express')

let signout = express.Router()

let props = {
    title: cfg.title,
    theme: cfg.template
}

signout.get('/', (req, res) => {
    req.logout()
    res.render('signin', props)
})
/*
signin.post('/', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/signin',
    failureFlash: true
}))
*/
/*
signin.post('/', (req,res,next) => {
    passport.authenticate('local', {
        failureFlash: true,
        session: false
    }, (err,user,info) => {
        if(err) return next(err)

        if (user) {
            req.login(user, { failureFlash: true, session: false }, (err) => {
                if (err) next(err)

                const accessToken = token.sign(user, tokenGrantSecret)
                res.cookie('token', accessToken, {expire: 360000 + Date.now(), maxAge: -1, httpOnly: true, path: '/', signed: true })
                res.redirect('/')
            })
        } else {
            req.flash('error',info.message)
            res.status(401)
            res.redirect('/signin')
        }
    })(req,res,next)
})
*/

module.exports = signout

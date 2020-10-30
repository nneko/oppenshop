const cfg = require('../configuration/index.js')
const express = require('express')
const passport = require('passport')
const user = require('../models/user')
const bcrypt = require('bcryptjs')
const reset_mailer = require('./user/resetpassword')
const validator = require('../utilities/validator')
const debug = cfg.env == 'development' ? true : false
const generator = require('../utilities/generator')




let reset = express.Router()

reset.get('/', (req, res) => {
    if(req.user) {
        res.redirect('/user/account?show=ls', { csrfToken: req.csrfToken() })
    } else {
        res.render('reset', { csrfToken: req.csrfToken() })
    }
})
/*
reset.post('/', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/reset',
    failureFlash: true
}))
*/
reset.post('/', async (req, res) => {
    
    let u = {}
    
    let formValidated = false
    let formFields = {}
    
    //Preferred Username and Emails
    if (validator.isNotNull(req.body.username) && validator.isEmailAddress(req.body.username)) {
        u.preferredUsername = String(req.body.username)
        formFields.username = { class: 'is-valid', value: u.preferredUsername }
    } else {
        formFields.username = { class: 'is-invalid', message: 'Please enter a valid email address.' }
    }

    let hasInvalids = false;

    for (const k of Object.keys(formFields)) {
        if (formFields[k].class == 'is-invalid') {
            hasInvalids = true
            break
        }
    }

    hasInvalids ? formValidated = false : formValidated = true
    
    if (!formValidated) {
        if (debug) {
            console.log('Invalid reset request. Invalid fields: ')
            console.log(formFields)
        }
        formFields.messages = {error: 'Please enter valid user details'}
        formFields.csrfToken = req.csrfToken()
        res.status(400)
        res.render('reset', formFields)
    } else {
        try {
            const userExists = await user.exists(u)
            if(userExists) {
		        u = await user.read({ preferredUsername: u.preferredUsername }, { limit: 1 })
                //console.log(u)
                if(u.provider != 'native'){
                    res.render('reset', {messages: { error: 'You cannot reset passwords for external accounts' }, csrfToken: req.csrfToken()})
                    return
                }
                let new_password = generator.randomString(10)
                let new_password_hash = await bcrypt.hash(String(new_password), 10)
                await user.update(u,{password: new_password_hash})
		        // TODO: Send reset email
                reset_mailer.password_reset({name: u.name.givenName, email: u.preferredUsername, temp: new_password})
                formFields.messages = { info: 'Please check email for reset password details.' }
                res.render('signin', { messages: formFields.messages ,  csrfToken: req.csrfToken() })
            } else {
                res.render('reset', { messages: { error: 'Account is not registered.' } , csrfToken: req.csrfToken() })
            }
            
        } catch (e) {
            if (debug) console.log('Unable to send reset password email due to error: ')
            if (debug) console.log(e)

            let status = 500

            formFields.error = 'The password could not be reset at this time. Please try again later.'
            formFields.csrfToken = req.csrfToken()

            if (e.name == 'UserError') {
                if (e.type == 'Invalid') {
                    formFields.username = {
                        class: 'is-invalid',
                        message: 'Invalid user account. Please try a different email address.'
                    }
                    formFields.messages = {error: e.message}
                    status = 403
                }
            } else {
                formFields.messages = {error: 'Reset Password could not be sent. Please try again later.'}
            }
            res.status(status)
            res.render('reset', formFields)
        }
    }
    
})

module.exports = reset

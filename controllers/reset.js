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

let props = {
    title: cfg.title,
    theme: cfg.template
}

reset.get('/', (req, res) => {
    res.render('reset', props)
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
        res.render('reset', formFields, (err, html) => {
            res.status(400).send(html)
        })
    } else {
        try {
            const userExists = await user.exists(u)
            if(userExists) {
		u = await user.read({ preferredUsername: u.preferredUsername }, { limit: 1 })
                //console.log(u)
                formFields.messages = {check: 'Please check email for reset password details.'}
                let new_password = generator.randomString(10)
                let new_password_hash = await bcrypt.hash(String(new_password), 10)
		await user.update(u,{password: new_password_hash})
		// TODO: Send reset email
		reset_mailer.password_reset({name: u.name.givenName, email: u.preferredUsername, temp: new_password})
                res.render('signin', { title: cfg.title, theme: cfg.template, messages: { error: 'Please check email for reset password details.' } })
            } else {
                res.render('reset', { title: cfg.title, theme: cfg.template, messages: { error: 'Account is not registered.' } })
            }
            
        } catch (e) {
            if (debug) console.log('Unable to send reset password email due to error: ')
            if (debug) console.log(e)

            let status = 500

            formFields.error = 'The password could not be reset at this time. Please try again later.'

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
            res.render('reset', formFields, (err, html) => {
                res.status(status).send(html)
            })
        }
    }
    
})

module.exports = reset

const cfg = require('../configuration/index.js')
const express = require('express')
const mailer = require('../adapters/messaging/mailer.js')
const validator = require('../utilities/validator.js')
const user = require('../models/user')
const debug = cfg.env == 'development' ? true : false
const jwt = require('jsonwebtoken')

let verify = express.Router()

let props = {
    title: cfg.title,
    theme: cfg.template
}

let verifyEmailer = {}


verifyEmailer.sendWelcome = async _data => {
    try {
        let data = {}
        data.subject = 'OppenShop - Welcome'
        data.text = 'Welcome ' + _data.name + ',\nOppenshop is local platform marketplace to view, shop and pay for locally.\n\nBest Regards,\nAdmin'
        data.html = 'Welcome </b>' + _data.name + '</b>,<br>Oppenshop is local platform marketplace to view, shop and pay for locally.<br><br>Best Regards,<br>Admin'
        data.to = _data.email
        await mailer.send(data)
    } catch (e) {
        console.error(e)
    }
}

let validate = async data => {
    try {
        let decoded_data = jwt.verify(data, cfg.accessTokenSecret);
        // TODO: Call to check if details in DB and add flag verified, return true or false 
        const usr = await user.read({ preferredUsername: data.email })
        if(validator.isNotNull(usr.verificationToken) && validator.isNotNull(usr.verified) && (usr.verified != true)){
            if(usr.verificationToken == data.token) {
                return true
            } else {
                console.log('Verification failed. Token mismatch: ' + data.token + ' for user ' + data.email)
                return false
            }
        }
        else {
            return false
        }
    } catch (e) {
        throw new Error('Error reading user data during token verification')
    }
}

verify.get('/', async (req, res) => {
    try {
        let isVerified = false
        let queryData = req.query.data
        if (validator.isNotNull(queryData)) {
            isVerified = await validate(queryData)
            if (isVerified) {
                res.render('verify', { title: cfg.title, theme: cfg.template, messages: { success: 'Email verified.' } })
            } else {
                res.render('verify', { title: cfg.title, theme: cfg.template, messages: { error: 'Account could not be verified.' } })
            }
        }
        else {
            res.render('verify', props)
        }
    } catch (e) {
        console.log(e)
        let status = 500
        props.messages = { error: 'Unable to complete verification. Please try again later.' }
        res.render('verify', props, (err, html) => {
            res.status(status).send(html)
        })
    }
})

verify.post('/', async (req, res) => {

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
            console.log('Invalid resend verification request. Invalid fields: ')
            console.log(formFields)
        }
        formFields.messages = {error: 'Please enter valid user details'}
        res.render('verify', formFields, (err, html) => {
            res.status(400).send(html)
        })
    } else {
        try {
            const userExists = await user.exists(u)
            if(!userExists) {
                let e = new Error('Invalid user account')
                e.name = 'UserError'
                e.type = 'Invalid'
                throw e
            }
            const usr = await user.read(u)
            console.log(typeof(usr.verified))
            if(validator.isNotNull(usr.verified) && (usr.verified != true)) {
                let verificationToken = generator.randomString(32)
                await user.update(u,{verificationToken: verificationToken, verified: false})
                verifyEmailer.sendEmailVerification({ name: usr.givenName, email: u.preferredUsername, token: verificationToken })

                res.render('verify', { title: cfg.title, theme: cfg.template, messages: { check: 'Verification link sent to email.' } })
            } else {
                res.render('verify', { title: cfg.title, theme: cfg.template, messages: { error: 'Account is already verified.' } })
            }
        } catch (e) {
            if (debug) console.log('Unable to resend verification email due to error: ')
            if (debug) console.log(e)

            let status = 500

            formFields.error = 'The verification could not be resent at this time. Please try again later.'

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
                formFields.messages = {error: 'Verification could not be sent. Please try again later.'}
            }
            res.render('verify', formFields, (err, html) => {
                res.status(status).send(html)
            })
        }
    }
})

module.exports = verify

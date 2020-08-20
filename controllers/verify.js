const cfg = require('../configuration/index.js')
const express = require('express')
const mailer = require('../adapters/messaging/mailer.js')
const validator = require('../utilities/validator.js')
const user = require('../models/user')
const debug = cfg.env == 'development' ? true : false
const jwt = require('jsonwebtoken')
const generator = require('../utilities/generator')

let verify = express.Router()

let verifyEmailer = {}


verifyEmailer.sendWelcome = async _data => {
    try {
        let data = {}
        data.subject = 'Welcome to OppenShop'
        data.text = 'Welcome ' + _data.name + ',\nOppenshop is a platform that provides a marketplace to view, shop and pay for local goods and services.\n\nBest Regards,\nThe OppenShop Team'
        data.html = 'Welcome </b>' + _data.name + '</b>,<br><br>Oppenshop is a platform that provides a marketplace to view, shop and pay for local goods and services.<br><br>Best Regards,<br>The OppenShop Team'
        data.to = _data.email
        await mailer.send(data)
    } catch (e) {
        console.error(e)
    }
}

verifyEmailer.sendEmailVerification = async _data => {
    try {
        let data = {}
        data.subject = 'OppenShop Email Verification'
        let token = jwt.sign({ email: _data.email, token: _data.token }, cfg.accessTokenSecret)
        let url = cfg.endpoint + 'verify?data=' + token
        data.text = 'Good Day ' + _data.name + ',\n\nPlease select the link below to verify your email address:\n' + url + '\n\nBest Regards,\The OppenShop Team'
        data.html = 'Good Day <b>' + _data.name + '</b>,<br><br>Please select the link below to verify your email address:<br><a href="' + url + '">Email Verify Link</a><br><br>Best Regards,<br>The OppenShop Team'
        data.to = _data.email
        await mailer.send(data)
    } catch (e) {
        console.error(e)
    }
}

let dataDecoder = data => {
    let decoded_data = jwt.verify(data, cfg.accessTokenSecret);
    return decoded_data
}

let validate = async data => {
    try {
        const usr = await user.read({ preferredUsername: data.email },{limit: 1})
        if(usr.verificationToken && (!usr.verified)){
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
            let userData = dataDecoder(queryData)
            isVerified = await validate(userData)
            if (isVerified) {
                let u = await user.read({ preferredUsername: userData.email }, { limit: 1 })
                await user.update({preferredUsername: u.preferredUsername}, {verificationToken: null }, {}, 'unset')
                await user.update({ preferredUsername: u.preferredUsername }, {verified: true})
                userData.name = u.name.givenName
                verifyEmailer.sendWelcome(userData)
                res.render('verify', { title: cfg.title, theme: cfg.template, messages: { success: 'Your account has been verified.' }, user:req.user })
            } else {
                console.log('Invalid verification request')
                console.log(userData)
                res.render('verify', { title: cfg.title, theme: cfg.template, user: req.user, messages: { error: 'Verification unsuccessful. Invalid or expired request.' } })
            }
        }
        else {
            let viewData = {
                user: req.user} 
            res.render('verify', viewData)
        }
    } catch (e) {
        console.log(e)
        let status = 500
        messages = { error: 'Unable to complete verification due to error. Please try again later.' }
        res.status(status)
        let viewData = {
            user: req.user,
            messages: messages
        }
        res.render('verify', viewData)
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
        formFields.user = req.user
        res.status(400)
        res.render('verify', formFields)
    } else {
        try {
            const userExists = await user.exists(u)
            if(!userExists) {
                let e = new Error('Invalid user account')
                e.name = 'UserError'
                e.type = 'Invalid'
                throw e
            }
            const usr = await user.read(u,{limit: 1})
            console.log(usr)
            console.log(usr.verified)
            if(!usr.verified) {
                let verificationToken = generator.randomString(32)
                await user.update(u,{verificationToken: verificationToken, verified: false})
                verifyEmailer.sendEmailVerification({ name: usr.name.givenName, email: u.preferredUsername, token: verificationToken })

                res.render('verify', { title: cfg.title, theme: cfg.template, user: req.user, messages: { info: 'New verification link sent.' } })
            } else {
                res.render('verify', { title: cfg.title, theme: cfg.template, user: req.user, messages: { error: 'Account is already verified.' } })
            }
        } catch (e) {
            if (debug) console.log('Unable to resend verification email due to error: ')
            if (debug) console.log(e)

            let status = 500

            formFields.error = 'The verification link could not be resent at this time. Please try again later.'

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
                formFields.messages = {error: 'Verification link could not be sent. Please try again later.'}
            }
            formFields.user = req.user
            res.status(status)
            res.render('verify', formFields)
        }
    }
})

module.exports = verify

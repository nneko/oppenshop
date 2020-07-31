const cfg = require('../configuration/index.js')
const validator = require('../utilities/validator')
const user = require('../models/user')
const bcrypt = require('bcryptjs')
const express = require('express')
const debug = cfg.env == 'development' ? true : false
const mailer = require('../adapters/messaging/mailer.js')
const jwt = require('jsonwebtoken')
const generator = require('../utilities/generator')

let signup = express.Router()

let props = {
    title: cfg.title,
    theme: cfg.template
}

let signupEmailer = {}

signupEmailer.sendEmailVerification = async _data => {
    try {
        let data = {}
        data.subject = 'OppenShop Email Verification'
        let token = jwt.sign({ email: _data.email, token: _data.token }, cfg.accessTokenSecret)
        let url = cfg.endpoint + 'verify?data=' + token
        data.text = 'Good Day ' + _data.name + ',\n\nPlease select the link below to verify your email address:\n' + url + '\n\nBest Regards,\nThe OppenShop Team'
        data.html = 'Good Day ' + _data.name + ',<br><br>Please select the link below to verify your email address:<br><a href="' + url + '">Email Verify Link</a><br><br>Best Regards,<br>The OppenShop Team'
        data.to = _data.email
        await mailer.send(data)
    } catch (e) {
        console.error(e)
    }
}

signup.get('/', (req, res) => {
    res.render('signup', props)
})

signup.post('/', async (req,res) => {
    let u = {}
    
    let formValidated = false
    let formFields = {}

    //Preferred Username and Emails
    if(validator.isNotNull(req.body.username) && validator.isEmailAddress(req.body.username)) {
        u.preferredUsername = String(req.body.username).toLowerCase()
        if(validator.isEmailAddress(req.body.username)) u.emails = [{value: u.preferredUsername, primary: true}]
        formFields.username = {class: 'is-valid', value: u.preferredUsername}
    } else {
         formFields.username = {class: 'is-invalid', message: 'Please enter a valid email address.'}
    }

    //Authentication Provider
    validator.isAuthProvider(req.body.provider) ? u.provider = req.body.provider : u.provider = 'native'

    //Name
    let name = {}
    if (validator.isNotNull(req.body.givenName)) { 
        name.givenName = String(req.body.givenName)
        formFields.givenName = { class: 'is-valid', value: name.givenName }
     } else {
        formFields.givenName = {class: 'is-invalid', message: 'You must provide your Given Name.'}
     }
    
    if (validator.isNotNull(req.body.familyName)) {
        name.familyName = String(req.body.familyName)
        formFields.familyName = {class: 'is-valid', value: name.familyName}
    } else {
        formFields.familyName = {
            class: 'is-invalid',
            message: 'You must provide your Family Name.'
        }
    }
    u.name = name
    u.displayName = name.givenName + ' ' + name.familyName
    
    //Password
    if(validator.isNotNull(req.body.password)) {
        const pwHash = await bcrypt.hash(String(req.body.password), 10)
        u.password = pwHash
    } else {
        formFields.password = {
            class: 'is-invalid', 
            message: 'Please enter a password'
        }
    }
    
    //Addresses
    let addresses = []
    u.addresses = addresses

    //PhoneNumbers
    let phoneNumbers = []
    u.phoneNumbers = phoneNumbers

    if (!validator.isNotNull(req.body.tac)) {
        formFields.tac = {
            class: 'is-invalid',
            message: 'You must read and accept the Terms and Conditions.'
        }
    }

    let hasInvalids = false;

    for (const k of Object.keys(formFields)) {
        if(formFields[k].class == 'is-invalid') {
            hasInvalids = true
            break
        } 
    } 
    
    hasInvalids ? formValidated = false : formValidated = true

    if(!formValidated) {
        if(debug){
            console.log('Invalid signup request received. Missing fields: ')
            console.log(formFields)
        }
        res.status(400)
        res.render('signup',formFields)
    } else {
        try {
            let verificationToken = generator.randomString(32)
            u.verificationToken = verificationToken
            u.verified = false
            const result = await user.create(u)
            if(debug)console.log('User account created for '+u.preferredUsername)
            signupEmailer.sendEmailVerification({name: req.body.givenName, email: u.preferredUsername, token: u.verificationToken})
            res.render('verify', { title: cfg.title, theme: cfg.template, messages: { info: 'A verification link has been sent via email.' } })
        } catch (e) {
            if(debug) console.log('Unable to create user account due to error: ')
            if(debug) console.log(e)

            let status = 500

            formFields.error = 'An error occured during signup. Please try again later.'

            if(e.name == 'UserError') {
                if(e.type == 'Duplicate') {
                    formFields.username = {
                        class: 'is-invalid',
                        message: 'Please try a different email address.'
                    }
                    formFields.error = e.message
                    status = 403
                } 
            }
            res.status(status)
            res.render('signup',formFields)
        }
    }
})

module.exports = signup

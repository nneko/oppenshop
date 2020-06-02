const cfg = require('../configure.js')
const validator = require('../utility/validator')
const user = require('../model/user')
const bcrypt = require('bcryptjs')
const express = require('express')
const debug = cfg.env == 'development' ? true : false

let signup = express.Router()

let props = {
    title: cfg.title,
    theme: cfg.template
}

signup.get('/', (req, res) => {
    res.render('signup', props)
})

signup.post('/', async (req,res) => {
    let u = {}
    
    let formValidated = false
    let formFields = {}

    if(validator.isNotNull(req.body.email) && validator.isEmailAddress(req.body.email)) {
        u.email = String(req.body.email)
        formFields.email = {class: 'is-valid', value: u.email}
     } else {
         formFields.email = {class: 'is-invalid', message: 'Please enter a valid email address.'}
     }

    if (validator.isNotNull(req.body.firstname)) { 
        u.firstname = String(req.body.firstname)
        formFields.firstname = { class: 'is-valid', value: u.firstname }
     } else {
        formFields.firstname = {class: 'is-invalid', message: 'You must provide your First Name.'}
     }
    
    if (validator.isNotNull(req.body.lastname)) {
        u.lastname = String(req.body.lastname)
        formFields.lastname = {class: 'is-valid', value: u.lastname}
    } else {
        formFields.lastname = {
            class: 'is-invalid',
            message: 'You must provide your Last Name.'
        }
    }
    
    if(validator.isNotNull(req.body.password)) {
        const pwHash = await bcrypt.hash(String(req.body.password), 10)
        u.password = pwHash
    } else {
        formFields.password = {
            class: 'is-invalid', 
            message: 'Please enter a password'
        }
    }
    
    if (validator.isNotNull(req.body.addressStreet)) {
        u.addressStreet = String(req.body.addressStreet)
        formFields.addressStreet = {class: 'is-valid', value: u.addressStreet}
     } else {
        formFields.addressStreet = {
            class: 'is-invalid',
            message: 'Please provide a street address.'
        }
    }
    
    if (validator.isNotNull(req.body.addressState)) {
        u.addressState = String(req.body.addressState)
    } else {
        formFields.addressState = {
            class: 'is-invalid',
            message: 'You must select a valid Parish / State.'
        }
    }
    
    if (validator.isNotNull(req.body.addressPostcode)) {
        u.addressPostcode = String(req.body.addressPostcode)
        formFields.addressPostcode = { class: 'is-valid', value: u.addressPostcode}
     } else {
        formFields.addressPostcode = {
            class: 'is-invalid',
            message: 'You must enter a valid postal code.'
        }
    }
    
    if (validator.isNotNull(req.body.addressCountry)) {
        u.addressCountry = String(req.body.addressCountry)
    } else {
        formFields.addressCountry = {
            class: 'is-invalid',
            message: 'You must select a country.'
        }
    }

    if (validator.isNotNull(req.body.phoneNumber)) {
        u.phoneNumber = String(req.body.phoneNumber)
        formFields.phoneNumber = { class: 'is-valid', value: u.phoneNumber }
    } else {
        formFields.phoneNumber = {
            class: 'is-invalid',
            message: 'Please provide a valid phone number.'
        }
    }

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
        res.render('signup',formFields, (err, html) => {
            res.status(400).send(html)
        })
    } else {
        try {
            const result = await user.create(u)
            if(debug)console.log('User account created for '+u.email)
            res.redirect('/signin')
        } catch (e) {
            if(debug) console.log('Unable to create user account due to error: ')
            if(debug) console.log(e)
            formFields.error = 'An error occured during signup. Please try again later.'
            res.render('signup',formFields,(err, html) => {
                res.status(500).send(html)
            })
        }
    }
})

module.exports = signup
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

    //Preferred Username and Emails
    if(validator.isNotNull(req.body.email) && validator.isEmailAddress(req.body.email)) {
        u.preferredUsername = String(req.body.email)
        u.emails = [{value: u.preferredUsername, primary: true}]
        formFields.email = {class: 'is-valid', value: u.preferredUsername}
    } else {
         formFields.email = {class: 'is-invalid', message: 'Please enter a valid email address.'}
    }

    //Authentication Provider
    validator.isAuthProvider(req.body.provider) ? u.provider = req.body.provider : u.provider = 'oppenshop.com'

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
    /*
    let primaryAddress = {}
    if (validator.isNotNull(req.body.addressStreet)) {
        primaryAddress.streetAddress = String(req.body.addressStreet)
        formFields.addressStreet = {class: 'is-valid', value: primaryAddress.streetAddress}
     } else {
        formFields.addressStreet = {
            class: 'is-invalid',
            message: 'Please provide a street address.'
        }
    }

    if (validator.isNotNull(req.body.addressCity)) {
        primaryAddress.locality = String(req.body.addressCity)
    } else {
        formFields.addressCity = {
            class: 'is-invalid',
            message: 'You must select a valid locality/city.'
        }
    }
    
    if (validator.isNotNull(req.body.addressState)) {
        primaryAddress.region = String(req.body.addressState)
    } else {
        formFields.addressState = {
            class: 'is-invalid',
            message: 'You must select a valid Parish / State.'
        }
    }
    
    if (validator.isNotNull(req.body.addressPostcode)) {
        primaryAddress.postalCode = String(req.body.addressPostcode)
        formFields.addressPostcode = { class: 'is-valid', value: primaryAddress.postalCode}
     } else {
        formFields.addressPostcode = {
            class: 'is-invalid',
            message: 'You must enter a valid postal code.'
        }
    }
    
    if (validator.isNotNull(req.body.addressCountry)) {
        primaryAddress.country = String(req.body.addressCountry)
    } else {
        formFields.addressCountry = {
            class: 'is-invalid',
            message: 'You must select a country.'
        }
    }
    primaryAddress.primary = true
    addresses.push(primaryAddress)    
    */
    u.addresses = addresses

    //PhoneNumbers
    let phoneNumbers = []
    /*
    if (validator.isNotNull(req.body.phoneNumber)) {
        phoneNumbers = [{value: String(req.body.phoneNumber), primary: true}]
        formFields.phoneNumber = { class: 'is-valid', value: u.phoneNumbers[0] }
    } else {
        formFields.phoneNumber = {
            class: 'is-invalid',
            message: 'Please provide a valid phone number.'
        }
    }
    */
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
        res.render('signup',formFields, (err, html) => {
            res.status(400).send(html)
        })
    } else {
        try {
            const result = await user.create(u)
            if(debug)console.log('User account created for '+u.preferredUsername)
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
const cfg = require('../../configuration')
const validator = require('../../utilities/validator')
const user = require('../../models/user')
const bcrypt = require('bcryptjs')
const express = require('express')
const debug = cfg.env == 'development' ? true : false
//const passport = require('passport')

let account = express.Router()

let props = {
    title: cfg.title,
    theme: cfg.template
}

// Render account view for bad request
let badRequest = (req, res) => {
    res.status(400)
    res.render('account', { title: props.title, theme: props.theme, user: req.user, messages: { error: 'Invalid request. Unable to perform account update.' } })
}

// Login & Security updates form handler
let lsFormHandler = async (req, res) => {
    let u = {}

    let formValidated = false
    let formFields = {}

    //Preferred Username and Emails
    if (validator.isNotNull(req.body.username) && validator.isEmailAddress(req.body.username)) {
        u.preferredUsername = String(req.body.username)
        formFields.username = { class: '', value: u.preferredUsername }
    } else {
        badRequest(req,res)
        return
    }

    //Password
    if (validator.isNotNull(req.body.password) && validator.isNotNull(req.body['password-confirmation'])) {
        if (req.body.password == req.body['password-confirmation']) {
            const pwHash = await bcrypt.hash(String(req.body.password), 10)
            u.password = pwHash
        } else {
            formFields.password = {
                class: 'is-invalid',
                message: 'Invalid or mismatched passwords'
            }
        }
    } else {
        formFields.password = {
            class: 'is-invalid',
            message: 'Invalid or mismatched passwords'
        }
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
            console.log('Invalid update account request received.')
            console.log(formFields)
        }
        formFields.title = props.title
        formFields.theme = props.theme
        formFields.messages = { info: 'Account could not be updated.' }
        formFields.user = req.user
        res.status(400)
        res.render('account', formFields)
        return
    } else {
        try {
            const result = await user.update({ preferredUsername: u.preferredUsername }, { password: u.password })
            if (debug) console.log('User account updated for ' + u.preferredUsername)
            res.render('account', {user: req.user, title: props.title, theme: props.theme, messages: {success: 'Account updated.'}})
        } catch (e) {
            console.error(e)
            res.status(500)
            res.render('error', { title: props.title, theme: props.theme, user: req.user, messages: { error: 'Unable to complete account update.' } })
        }
    }
}

// Contact information updates form handler
let ciFormHandler = async (req, res) => {

}

// New address updates form handler
let naFormHandler = async (req, res) => {

}

// Payment method updates form handler
let pmFormHandler = async (req, res) => {

}

// Preference updates form handler
let prFormHandler = async (req, res) => {

}

account.get('/', (req, res) => {
    if (validator.isNotNull(req.user)) {
        res.render('account', { title: props.title, theme: props.theme, user: req.user })
    } else {
        props.messages = {error: "You need to be signed in."}
        res.render('signin', props, (err, html) => {
            console.log('Error encountered during view render')
            console.error(err)
            res.status(500).send(html)
        })
    }
})

account.post('/', async (req, res) => {
    if (validator.isNotNull(req.user)) {
        try {
            let form = req.body

            // Check form id and pass off to appropriate form handler. Otherwise if no handler found render account page with unable to process request error message
            switch (form.id) {
                case 'ls':
                    await lsFormHandler(req,res)
                    break
                case 'ci':
                    break
                case 'na':
                    break
                case 'pm':
                    break
                case 'pr':
                    break
                default:
                    badRequest(res, req)
            }
        } catch (e) {
            console.error(e)
            res.status(500)
            res.render('error', { error: { status: 500, message: 'Account update error' }, name: '', user: req.user })
        }
    } else {
        props.messages = { error: "You need to be signed in." }
        res.render('signin', props, (err, html) => {
            console.log('Error encountered during view render')
            console.error(err)
            res.status(500).send(html)
        })
    }
})

module.exports = account

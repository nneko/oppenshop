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
let badRequest = (req, res, show, status, msg) => {
    typeof(status) === 'number' ? res.status(status) : res.status(400);
    res.render('account', { title: props.title, theme: props.theme, user: req.user, pane: show, messages: { error: msg ? msg : 'Invalid account update request.' } })
}

// Login & Security updates form handler
let lsFormHandler = async (req, res) => {
    let u = {}

    let formValidated = false
    let formFields = {}

    if(!req.body) {
        badRequest(req,res,'ls')
        return
    }

    //Validate username
    if (validator.isNotNull(req.body.username) && validator.isEmailAddress(req.body.username)) {
        u.preferredUsername = String(req.body.username)
        formFields.username = { class: '', value: u.preferredUsername }
    } else {
        badRequest(req,res,'ls')
        return
    }

    //Authenticate user and validate passwords
    if (req.body.password && req.body.nw_pwd && req.body.nw_pwd_confirm) {
        if (req.body.nw_pwd == req.body.nw_pwd_confirm) {
            const usr = await user.read({preferredUsername: u.preferredUsername },{limit: 1})
            if (await bcrypt.compare(req.body.password, usr.password)) {
                const nwPwHash = await bcrypt.hash(String(req.body.nw_pwd), 10)
                u.password = nwPwHash
            } else {
                res.status(403)
                res.render('account', { title: props.title, theme: props.theme, user: req.user, pane: 'ls', messages: { error: 'Authentication failed. Incorrect password.' } })
                return
            }
        } else {
            formFields.nw_pwd = {
                class: 'is-invalid',
                message: 'Invalid or mismatched passwords'
            }
            formFields.nw_pwd_confirm = {
                class: 'is-invalid',
                message: 'Invalid or mismatched passwords'
            }
        }
    } else {
        console.log(req.body.password)
        badRequest(req,res,'ls',400,'Passwords cannot be blank')
        return
    }

    let hasInvalids = false;

    for (const k of Object.keys(formFields)) {
        if (formFields[k].class == 'is-invalid') {
            hasInvalids = true
            break
        }
    }

    hasInvalids ? formValidated = false : formValidated = true

    // If form validate update the user login and security fields
    if (!formValidated) {
        if (debug) {
            console.log('Invalid update account request received.')
            console.log(formFields)
        }
        formFields.title = props.title
        formFields.theme = props.theme
        formFields.messages = { info: 'Account could not be updated.' }
        formFields.user = req.user
        formFields.pane = 'ls'
        res.status(400)
        res.render('account', formFields)
        return
    } else {
        try {
            const result = await user.update({ preferredUsername: u.preferredUsername }, { password: u.password })
            if (debug) console.log('User account updated for ' + u.preferredUsername)
            res.render('account', {user: req.user, title: props.title, theme: props.theme, messages: {success: 'Account updated.'}, pane: 'ls'})
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
        let qd = req.query.data
        let panel = undefined
        if(qd) {
            switch(qd.show){
                case 'ls':
                case 'ad':
                case 'or':
                case 'pm':
                case 'pr':
                    panel = qd.show
                    break
                default:
                    panel = 'ci'
            }
        }
        res.render('account', { title: props.title, theme: props.theme, user: req.user, pane: panel })
    } else {
        props.messages = {error: "You need to be signed in."}
        res.render('signin', props, (err, html) => {
            res.status(403).send(html)
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
            res.status(403).send(html)
        })
    }
})

module.exports = account

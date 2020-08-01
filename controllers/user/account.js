const cfg = require('../../configuration')
const validator = require('../../utilities/validator')
const user = require('../../models/user')
const bcrypt = require('bcryptjs')
const express = require('express')
const converter = require('../../utilities/converter')
const generator = require('../../utilities/generator')
const { render } = require('../../bin/app')
const debug = cfg.env == 'development' ? true : false
//const passport = require('passport')

let account = express.Router()

let props = {
    title: cfg.title,
    theme: cfg.template
}

// Render account view for bad request
let badRequest = async (req, res, show, status, msg, msgType) => {
    let verifiedUser = undefined
    if(req.user) {
        const u = await user.read(req.usr.id,{findBy: 'id'})
        verifiedUser = u.verified
    }
    typeof(status) === 'number' ? res.status(status) : res.status(400);

    let mtype = 'error'

    typeof(msgType) === 'undefined' ? mtype = 'error' : mtype = msgType;
    
    let mObj = {}
    mObj[mtype] = msg ? msg : 'Invalid account update request.' 

    res.render('account', { title: props.title, theme: props.theme, user: req.user, pane: show, messages:  mObj})
}

// Render account view for bad request
let _403redirect = (req, res, url, msg) => {
    res.status(403);
    res.render('signin', { title: props.title, theme: props.theme, url: url, messages: { error: msg ? msg : 'You must be signed in.' }, verifiedUser: verifiedUser })
}

let getPrimaryField = (list) => {
    let field = null

    if (validator.isNotNull(list)) {
        for (let i = 0; i < list.length; i++) {
            let e = list[i]
            let p = undefined
            for (const k of Object.keys(e)) {
                if (k == 'primary') {
                    p = e
                    break
                }
            }
            if(p) {
                field = p
                break
            }
        }
    }
    return field
}

let removePrimaryFields = (list) => {
    let new_list = list

    if (validator.isNotNull(new_list)) {
        for (let i = 0; i < new_list.length; i++) {
            let e = new_list[i]
            for (const k of Object.keys(e)) {
                if(k == 'primary') delete e[k]
            }
        }
    }
    return new_list
}

// Login & Security updates form handler
let lsFormHandler = async (req, res) => {
    try {
        if(!validator.hasActiveSession(req)) {
            _403redirect(req, res, '/user/account/?show=ls', 'You need to be signed in.')
            return
        }

        let u = {}

        let formValidated = false
        let formFields = {}

        if(!req.body) {
            await badRequest(req,res,'ls')
            return
        }

        const usr = await user.read(req.body.uid, { findBy: 'id' })

        if(!usr) {
            _403redirect(req, res, '/user/account/?show=ls', 'You need to be signed in.')
            return
        }

        //Validate username
        if (validator.isNotNull(req.body.username) && validator.isEmailAddress(req.body.username)) {
            u.preferredUsername = String(req.body.username)
            formFields.username = { class: '', value: u.preferredUsername }
        } else {
            await badRequest(req,res,'ls')
            return
        }

        //Authenticate user and validate passwords
        if (req.body.password && req.body.nw_pwd && req.body.nw_pwd_confirm) {
            if (String(req.body.nw_pwd) == String(req.body.nw_pwd_confirm)) {

                if(!validator.isLocalUserAccount(usr)) {
                    await badRequest(req,res,'ls',403,'You are not allowed to update credentials for an external account.')
                    return
                }

                if (await bcrypt.compare(String(req.body.password), usr.password)) {
                    const nwPwHash = await bcrypt.hash(String(req.body.nw_pwd), 10)
                    u.password = nwPwHash
                } else {
                    res.status(403)
                    res.render('account', { title: props.title, theme: props.theme, user: req.user, pane: 'ls', messages: { error: 'Authentication failed. Incorrect password.' }, verifiedUser: usr.verified })
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
            console.log(String(req.body.password))
            await badRequest(req,res,'ls',400,'Passwords cannot be blank.')
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
            formFields.verifiedUser = usr.verified
            res.status(400)
            res.render('account', formFields)
            return
        } else {
            try {
                const result = await user.update({ preferredUsername: u.preferredUsername }, { password: u.password })
                if (debug) console.log('User account updated for ' + u.preferredUsername)
                res.render('account', {user: req.user, title: props.title, theme: props.theme, messages: {success: 'Account updated.'}, pane: 'ls',verifiedUser: result.verified})
            } catch (e) {
                console.error(e)
                res.status(500)
                res.render('error', { title: props.title, theme: props.theme, user: req.user, messages: { error: 'Unable to complete account update.' } })
            }
        }
    } catch (e) {
        console.error(e)
        render('error', { title: props.title, theme: props.theme, messages: { error: 'Unable to process request', status: 500 } })
    }
}

// Contact information updates form handler
let ciFormHandler = async (req, res) => {

    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/user/account/?show=ci', 'You must be signed in.')
        return
    }

    let u = {}

    let formValidated = false
    let formFields = {}

    if (!req.body) {
        await badRequest(req, res, 'ci')
        return
    }

    let form = converter.objectFieldsToString(req.body)

    // Read existing stored user details
    const usr = await user.read(form.uid, { findBy: 'id' })

    u.preferredUsername = usr.preferredUsername

    //Validate name
    if (validator.isNotNull(form.givenName) && validator.isNotNull(form.familyName)) {
        u.name = {
            givenName: String(form.givenName), 
            familyName: String(form.familyName)
        }
        formFields.givenName = { class: 'valid', value: form.givenName }
        formFields.familyName = { class: 'valid', value: form.familyName }
    } else {
        await badRequest(req, res, 'ci', 400, 'You must provide the given and family names')
        return
    }

    //Validate phone
    if (validator.isNotNull(form.phone) && validator.isPhoneNumber(form.phone)) {
        
        usr.phoneNumbers ? u.phoneNumbers = usr.phoneNumbers : u.phoneNumbers = [];

        let primaryPhone  = {
            value: form.phone,
            type: form.phoneType || "mobile",
            primary: true
        }

        u.phoneNumbers = removePrimaryFields(u.phoneNumbers)
        u.phoneNumbers.push(primaryPhone)

        formFields.phone = { class: 'valid', value: form.phone}
    }

    //Validate address
    if (validator.isNotNull(form.addressStreet) && validator.isNotNull(form.addressLocality) && validator.isNotNull(form.addressRegion) && validator.isNotNull(form.addressPostcode) && validator.isNotNull(form.addressCountry)) {

        usr.addresses ? u.addresses = usr.addresses : u.addresses = [];

        let primaryAddr = {
            type: form.addressType || "home",
            streetAddress: form.addressStreet,
            locality: form.addressLocality,
            region: form.addressRegion,
            postalCode: form.addressPostcode,
            country: form.addressCountry,
            formatted: generator.formattedAddress({
                streetAddress: form.addressStreet,
                locality: form.addressLocality,
                region: form.addressRegion,
                postalCode: form.addressPostcode,
                country: form.addressCountry}),
            primary: true
        }
        if(!primaryAddr.formatted) delete primaryAddr.formatted
        u.addresses = removePrimaryFields(u.addresses)
        u.addresses.push(primaryAddr)

        formFields.addressStreet = { class: 'valid', value: form.addressStreet}
        formFields.addressLocality = { class: 'valid', value: form.addressLocality}
        formFields.addressRegion = { class: 'valid', value: form.addressRegion}
        formFields.addressPostcode = { class: 'valid', value: form.addressPostcode}
        formFields.addressCountry = { class: 'valid', value: form.addressCountry}
    } else if(form.addressStreet || form.addressLocality || form.addressRegion || form.addressPostcode || form.addressCountry) {
        formFields.addressStreet = { class: 'is-invalid', value: form.addressStreet }
        formFields.addressLocality = { class: 'is-invalid', value: form.addressLocality }
        formFields.addressRegion = { class: 'is-invalid', value: form.addressRegion }
        formFields.addressPostcode = { class: 'is-invalid', value: form.addressPostcode }
        formFields.addressCountry = { class: 'is-invalid', value: form.addressCountry }
    }

    let hasInvalids = false;

    for (const k of Object.keys(formFields)) {
        if (typeof (formFields[k].class) === 'undefined' || formFields[k].class == 'is-invalid') {
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
        formFields.messages = { info: 'Account could not be updated. One or more fields had invalid entries.' }
        formFields.user = req.user
        formFields.pane = 'ci'
        formFields.verifiedUser = usr.verified
        res.status(400)
        res.render('account', formFields)
        return
    } else {
        try {
            await user.update({ preferredUsername: u.preferredUsername }, u)
            if (debug) console.log('User account updated for ' + u.preferredUsername)
            formFields.title = props.title
            formFields.theme = props.theme
            formFields.user = req.user
            formFields.messages = { success: 'Account updated.' }
            formFields.pane = 'ci'
            formFields.verifiedUser = usr.verified
            res.render('account', formFields)
        } catch (e) {
            console.error(e)
            res.status(500)
            res.render('error', { title: props.title, theme: props.theme, user: req.user, messages: { error: 'Unable to complete account update.' } })
        }
    }

}

// New address updates form handler
let naFormHandler = async (req, res) => {

    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/user/account/?show=na', 'You must be signed in.')
        return
    } else {
        await badRequest(req,res,501,'ad','Functionality not implemented','info')
        return
    }

}

// Payment method updates form handler
let pmFormHandler = async (req, res) => {

    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/user/account/?show=pm', 'You must be signed in.')
        return
    } else {
        return await badRequest(req, res, 501, 'pm', 'Functionality not implemented','info')
    }

}

// Preferences updates form handler
let prFormHandler = async (req, res) => {

    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/user/account/?show=pr', 'You must be signed in.')
        return
    } else {
        return await badRequest(req, res, 501, 'pr', 'Functionality not implemented','info')
    }

}

// Deletion form handler
let deleteHandler = async (req, res) => {

    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/user/account/?show=pr', 'You must be signed in.')
        return
    } else {
        try {
            if (!req.body) {
                await badRequest(req, res, 'pr')
                return
            }

            if (req.user.id != req.body.uid) {
                await badRequest(req, res, 'pr', 403, 'Bad request. Permission denied.')
                return
            }
            let u = await user.read(req.body.uid,{findBy: 'id'})
            req.logout()
            const deleted = await user.delete({preferredUsername: u.preferredUsername})
            if(deleted.deletedCount > 0){
                res.render('index', { name: undefined, user: undefined, title: props.title, theme: props.theme, messages: { success: 'Account deleted.' } })
            } else {
                let e = new Error('Deletion failed')
                e.name = 'UserError'
                e.type = 'Delete Operation'
                throw e
            }
        } catch (e) {
            console.error(e)
            res.status(500)
            res.render('account', { title: props.title, theme: props.theme, user: req.user, pane: 'pr', messages: { error: 'Unable to delete account.' }, verifiedUser: u.verified })
        }
    }

}

account.get('/', async (req, res) => {
    try {
        if (validator.hasActiveSession(req)) {
            let qd = req.query.data
            let panel = 'ci'
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
            let dForms = {
                security: false,
                contact: false,
                addresses: false,
                orders: false,
                payments: false,
                settings: false
            }

            // Disable security credentials update for external accounts
            if(!validator.isLocalUserAccount(req.user)){
                dForms.security = true
            }
            let viewData = { title: props.title, theme: props.theme, user: req.user, pane: panel, disabledForms: dForms }

            const usr = await user.read(req.user.id,{findBy: 'id'})
            if(usr.verified) viewData.verifiedUser = usr.verified
            let primaryPhoneNumber = getPrimaryField(usr.phoneNumbers)
            let primaryAddress = getPrimaryField(usr.addresses)
            if(primaryPhoneNumber) {
                viewData.phone = {value: primaryPhoneNumber.value}
            }

            if(primaryAddress) {
                viewData.addressStreet = {value: primaryAddress.streetAddress}
                viewData.addressLocality = {value: primaryAddress.locality}
                viewData.addressRegion = {value: primaryAddress.region}
                viewData.addressPostcode = {value: primaryAddress.postalCode}
                viewData.addressCountry = {value: primaryAddress.country}
            }
            
            res.render('account', viewData)
        } else {
            props.messages = {error: "You need to be signed in."}
            res.status(403)
            res.render('signin', props)
        }
    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Error retrieving account data' }, name: '', user: req.user })

    }
})

account.post('/', async (req, res) => {
    try {
        if (validator.hasActiveSession(req)) {
            let form = req.body

            // Check form id and pass off to appropriate form handler. Otherwise if no handler found render account page with unable to process request error message
            switch (form.id) {
                case 'ls':
                    await lsFormHandler(req,res)
                    break
                case 'del':
                    await deleteHandler(req,res)
                    break
                case 'ci':
                    await ciFormHandler(req, res)
                    break
                case 'na':
                    await naFormHandler(req, res)
                    break
                case 'pm':
                    await pmFormHandler(req, res)
                    break
                case 'pr':
                    await prFormHandler(req, res)
                    break
                default:
                    await badRequest(req, res)
            }
        } else {
        _403redirect(req,res,'/user/account','You need to be signed in.')
        }
    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Account update error' }, name: '', user: req.user })
    }
})

module.exports = account

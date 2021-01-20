const cfg = require('../../configuration')
const validator = require('../../utilities/validator')
const user = require('../../models/user')
const bcrypt = require('bcryptjs')
const express = require('express')
const converter = require('../../utilities/converter')
const generator = require('../../utilities/generator')
const debug = cfg.env == 'development' ? true : false
//const passport = require('passport')
const currency = require('../../models/currency')
const accounthandler = require('../handlers/account')
const ShoppingBag = require('../../models/shoppingbag')
const warehouse = require('../../models/warehouse')
const parcel = require('../../models/parcel')

let account = express.Router()

// Render account view for bad request
let badRequest = async (req, res, show, status, msg, msgType) => {
    let verifiedUser = undefined

    typeof (status) === 'number' ? res.status(status) : res.status(400);

    let mtype = 'error'

    typeof (msgType) === 'undefined' ? mtype = 'error' : mtype = msgType;

    let mObj = {}
    mObj[mtype] = msg ? msg : 'Invalid account update request.'

    try {
        if (req.user) {
            let viewData = await accounthandler.populateUserViewData(req.user.id.toString())
            viewData.user = req.user
            viewData.pane = show
            viewData.messages = mObj
            res.render('account', viewData)
        } else {
            res.render('account', {user: undefined, pane: show, messages: mObj})
        }

    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', {  user: req.user, error: {message: 'Internal error due to bad request' }})
    }
}

// Render account view for bad request
let _403redirect = (req, res, url, msg) => {
    let verifiedUser = undefined
    res.status(403);
    res.render('signin', {  url: url, messages: { error: msg ? msg : 'You must be signed in.' }, verifiedUser: verifiedUser })
}

let getField = generator.getField

let getPrimaryField = generator.getPrimaryField

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
                    let viewData = await accounthandler.populateUserViewData(req.user.id.toString())
                    viewData.user = req.user
                    viewData.pane = 'ls'
                    viewData.messages = { error: 'Authentication failed. Incorrect password.' }
                    res.status(403)
                    res.render('account', viewData)
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
            let viewData = await accounthandler.populateUserViewData(req.user.id.toString())
            viewData.user = req.user
            viewData.pane = 'ls'
            viewData.messages = { info: 'Account could not be updated.' }
            res.status(400)
            res.render('account', viewData)
            return
        } else {
            try {
                //const result = await user.update({ preferredUsername: u.preferredUsername }, { password: u.password })
                //if (debug) console.log('User update password response: ' + result)
                let u_lsformhandler = await accounthandler.lsFormHandler(u.preferredUsername,u.password)
                // TODO: validation check on 'u_lsformhandler' response to show response if updated or not
                if (debug) console.log('User update password response: ' + u_lsformhandler)
                if (debug) console.log('User account updated for ' + u.preferredUsername)
                let viewData = await accounthandler.populateUserViewData(req.user.id.toString())
                viewData.user = req.user
                viewData.pane = 'ls'
                if (u_lsformhandler.modifiedCount > 0) {
                  viewData.messages = { success: 'Account updated.' }
                } else {
                  viewData.messages = { error: 'Account could not be updated.' }
                }
                res.render('account', viewData)
            } catch (e) {
                console.error(e)
                res.status(500)
                res.render('error', {  user: req.user, error: {message: 'Unable to complete account update.'} })
            }
        }
    } catch (e) {
        console.error(e)
        render('error', {  error: {message: 'Unable to process request', status: 500}, user: req.user })
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

    if (form.uid != req.user.id.toString()) {
        _403redirect(req, res, '/user/account/?show=ci', 'Permission denied.')
        return
    }

    // Read existing stored user details
    const usr = await user.read(form.uid, { findBy: 'id' })

    u.preferredUsername = usr.preferredUsername

    //Validate name
    if (validator.isNotNull(form.givenName) && validator.isNotNull(form.familyName)) {
        /*
        u.name = {
            givenName: String(form.givenName),
            familyName: String(form.familyName)
        }
        */
        formFields.givenName = { class: 'valid', value: form.givenName }
        formFields.familyName = { class: 'valid', value: form.familyName }
    } else {
        await badRequest(req, res, 'ci', 400, 'You must provide the given and family names')
        return
    }

    //Validate phone
    if (validator.isNotNull(form.phone) && validator.isPhoneNumber(form.phone)) {
        /*
        usr.phoneNumbers ? u.phoneNumbers = usr.phoneNumbers : u.phoneNumbers = [];

        let primaryPhone  = {
            value: form.phone,
            type: form.phoneType || "other",
            primary: true
        }

        u.phoneNumbers = removePrimaryFields(u.phoneNumbers)
        u.phoneNumbers.push(primaryPhone)
        */
        formFields.phone = { class: 'valid', value: form.phone}
    }

    //Validate address
    if (validator.isNotNull(form.addressStreet) && validator.isNotNull(form.addressLocality) && validator.isNotNull(form.addressRegion) && validator.isNotNull(form.addressPostcode) && validator.isNotNull(form.addressCountry)) {
        /*
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
        */
        formFields.addressStreet = { class: 'valid', value: form.addressStreet}
        formFields.secondAddressStreet = { class: 'valid', value: form.secondAddressStreet}
        formFields.addressLocality = { class: 'valid', value: form.addressLocality}
        formFields.addressRegion = { class: 'valid', value: form.addressRegion}
        formFields.addressPostcode = { class: 'valid', value: form.addressPostcode}
        formFields.addressCountry = { class: 'valid', value: form.addressCountry}
    } else if(form.addressStreet || form.addressLocality || form.addressRegion || form.addressPostcode || form.addressCountry) {
        formFields.addressStreet = { class: 'is-invalid', value: form.addressStreet }
        formFields.secondAddressStreet = { class: 'is-valid', value: form.secondAddressStreet}
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
        let viewData = await accounthandler.populateUserViewData(req.user.id.toString())
        viewData.addressStreet = formFields.addressStreet
        viewData.secondAddressStreet = formFields.secondAddressStreet
        viewData.addressLocality = formFields.addressLocality
        viewData.addressRegion = formFields.addressRegion
        viewData.addressPostcode = formFields.addressPostcode
        viewData.addressCountry = formFields.addressCountry
        viewData.user = req.user
        viewData.pane = 'ci'
        viewData.messages = {error: 'One or more fields has invalid entries.'}
        res.status(400)
        res.render('account', viewData)
        return
    } else {
        try {
            //await user.update({ preferredUsername: u.preferredUsername }, u)
            let u_ciformhandler = await accounthandler.ciFormHandler(form)
            // TODO: validation check on 'u_lsformhandler' response to show response if updated or not

            if (debug) console.log('User account updated for ' + u.preferredUsername)
            let viewData = await accounthandler.populateUserViewData(req.user.id.toString())
            viewData.user = req.user
            viewData.pane = 'ci'
            viewData.messages = { success: 'Account updated.' }
            res.render('account', viewData)
        } catch (e) {
            console.error(e)
            res.status(500)
            res.render('error', {  user: req.user, error: {message: 'Unable to complete account update.' }})
        }
    }

}

// New address updates form handler
let naFormHandler = async (req, res) => {

    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/user/account/?show=na', 'You must be signed in.')
        return
    } else {
        let u = {}

        let formValidated = false
        let formFields = {}

        if (!req.body) {
            await badRequest(req, res, 'ad', 400, 'Invalid address.')
            return
        }

        let form = converter.objectFieldsToString(req.body)

        if (form.uid != req.user.id.toString()) {
            _403redirect(req, res, '/user/account/?show=ad', 'Permission denied.')
            return
        }

        // Read existing stored user details
        const usr = await user.read(form.uid, { findBy: 'id' })

        u.preferredUsername = usr.preferredUsername

        //Validate address
        if (validator.isNotNull(form.addressStreet) && validator.isNotNull(form.addressLocality) && validator.isNotNull(form.addressRegion) && validator.isNotNull(form.addressPostcode) && validator.isNotNull(form.addressCountry)) {
            /*
            usr.addresses ? u.addresses = usr.addresses : u.addresses = [];

            let addr = {
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
                    country: form.addressCountry
                })
            }

            if (!addr.formatted) delete addr.formatted

            if (validator.isNotNull(form.setPrimary) && form.setPrimary == 'true') {
                addr.primary = true
                u.addresses = removePrimaryFields(u.addresses)
            }

            // Add contact name to the address
            if(validator.isNotNull(form.fullname)) {
                let addrName = {formatted: form.fullname}
                addr.name = addrName
            }
            */
            // Add phone number to the address
            if(validator.isPhoneNumber(form.phone)) {
                /*
                let phone = {value: form.phone}
                phone.type = form.phoneType || 'home'

                addr.phoneNumbers = [phone]
                */
                formFields.new_Phone = {value: phone.value, class: 'valid'}
                formFields.new_PhoneType = {value: phone.type, class: 'unchecked'}
            } else {
                formFields.new_Phone = { value: '', class: 'unspecified' }
                formFields.new_PhoneType = { value: form.phoneType, class: 'unchecked' }
            }

            //u.addresses.push(addr)

            formFields.new_addressStreet = { class: 'valid', value: form.addressStreet }
            formFields.new_secondAddressStreet = { class: 'valid', value: form.secondAddressStreet }
            formFields.new_addressLocality = { class: 'valid', value: form.addressLocality }
            formFields.new_addressRegion = { class: 'valid', value: form.addressRegion }
            formFields.new_addressPostcode = { class: 'valid', value: form.addressPostcode }
            formFields.new_addressCountry = { class: 'valid', value: form.addressCountry }
            formFields.new_addressType = { class: 'unchecked', value: form.addressType }
        } else if (form.addressStreet || form.addressLocality || form.addressRegion || form.addressPostcode || form.addressCountry) {
            formFields.new_addressStreet = { class: 'is-invalid', value: form.addressStreet }
            formFields.new_secondAddressStreet = { class: 'is-invalid', value: form.secondAddressStreet }
            formFields.new_addressLocality = { class: 'is-invalid', value: form.addressLocality }
            formFields.new_addressRegion = { class: 'is-invalid', value: form.addressRegion }
            formFields.new_addressPostcode = { class: 'is-invalid', value: form.addressPostcode }
            formFields.new_addressCountry = { class: 'is-invalid', value: form.addressCountry }
            formFields.new_addressType = { class: 'unchecked', value: form.addressType }
        }

        if(form.fullname) formFields.fullname = { value: form.fullname, class: 'valid' }

        let hasInvalids = false;

        for (const k of Object.keys(formFields)) {
            if (typeof (formFields[k].class) === 'undefined' || formFields[k].class == 'is-invalid') {
                hasInvalids = true
                break
            }
        }

        hasInvalids ? formValidated = false : formValidated = true

        // If form validated add new address to the user's addresses
        if (!formValidated) {
            if (debug) {
                console.log('Invalid update account request received.')
                console.log(formFields)
            }
            let viewData = await accounthandler.populateUserViewData(req.user.id.toString())
            viewData.user = req.user
            viewData.pane = 'ad'
            viewData.messages = { error: 'One or more fields has invalid entries.' }
            viewData.new_addressStreet = formFields.new_addressStreet
            viewData.new_secondAddressStreet = formFields.new_secondAddressStreet
            viewData.new_addressLocality = formFields.new_addressLocality
            viewData.new_addressRegion = formFields.new_addressRegion
            viewData.new_addressPostcode = formFields.new_addressPostcode
            viewData.new_addressCountry = formFields.new_addressCountry
            viewData.new_addressType = formFields.new_addressType
            viewData.new_Phone = formFields.new_Phone
            viewData.new_PhoneType = formFields.new_PhoneType
            res.status(400)
            res.render('account', viewData)
            return
        } else {
            try {
                //await user.update({ preferredUsername: u.preferredUsername }, u)
                let u_naformhandler = await accounthandler.naFormHandler(form)
                // TODO: validation check on 'u_naformhandler' response to show response if updated or not

                if (debug) console.log('User account updated for ' + u.preferredUsername)
                let viewData = await accounthandler.populateUserViewData(req.user.id.toString())
                viewData.user = req.user
                viewData.pane = 'ad'
                viewData.messages = { success: 'Account updated.' }
                res.render('account', viewData)
            } catch (e) {
                console.error(e)
                res.status(500)
                res.render('error', { user: req.user, error: {message: 'Unable to complete account update.' }})
            }
        }
    }

}

// Payment method updates form handler
let pmFormHandler = async (req, res) => {

    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/user/account/?show=pm', 'You must be signed in.')
        return
    } else {
        return await badRequest(req, res,'pm', 501,'Functionality not implemented','info')
    }

}

// Preferences updates form handler
let prFormHandler = async (req, res) => {

    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/user/account/?show=pr', 'You must be signed in.')
        return
    } else {
        return await badRequest(req, res, 'pr', 501, 'Functionality not implemented','info')
    }

}

// Update address form handler
let addressUpdateHandler = async (req, res) => {

    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/user/account/?show=pr', 'You must be signed in.')
        return
    } else {
        if(!req.body) {

        }
        else {
            let u = {}

            let formValidated = false
            let formFields = {}
            let form = converter.objectFieldsToString(req.body)

            switch(form.update) {
                case 'delete':
                    if (form.uid != req.user.id.toString()) {
                            _403redirect(req, res, '/user/account/?show=em', 'Permission denied.')
                            return
                    }
                    console.log(form)
                    // Read existing stored user details
                    const usr = await user.read(form.uid, { findBy: 'id' })

                    u.preferredUsername = usr.preferredUsername

                    //Validate address
                    if (validator.isAddress({
                        streetAddress: form.street,
                        locality: form.locality,
                        region: form.region,
                        postalCode: form.postalCode,
                        country: form.country
                    })) {
                        formValidated = true
                    } else {
                        await badRequest(req, res, 'ad', 400, 'Invalid request.')
                        return
                    }

                    if (!formValidated) {
                        if (debug) {
                            console.log('Invalid account update request received.')
                        }
                        let viewData = await accounthandler.populateUserViewData(req.user.id.toString())
                        viewData.user = req.user
                        viewData.pane = 'ad'
                        if (!formFields.messages) formFields.messages = { error: 'Request could not be fulfilled.' }
                        viewData.messages = formFields.messages
                        formFields.status ? res.status(formFields.status) : res.status(400)
                        res.render('account', viewData)
                        return
                    } else {
                        try {
                            /*
                            u.addresses = removeAddressFields(usr.addresses, {
                                streetAddress: form.streetAddress,
                                locality: form.locality,
                                region: form.region,
                                postalCode: form.postalCode,
                                country: form.country
                            })
                            if(!(u.addresses.length < usr.addresses.length)) {
                                throw new Error('Unable to remove address')
                            }
                            */
                            //await user.update({ preferredUsername: u.preferredUsername }, u)
                            let u_addressupdatehandler = await accounthandler.addressUpdateHandler(form)
                            // TODO: validation check on 'u_addressupdatehandler' response to show response if updated or not

                            if (debug) console.log('User account updated for ' + u.preferredUsername)
                            let viewData = await accounthandler.populateUserViewData(req.user.id.toString())
                            viewData.user = req.user
                            viewData.pane = 'ad'
                            viewData.messages = { success: 'Account updated.' }
                            res.render('account', viewData)
                        } catch (e) {
                            console.error(e)
                            res.status(500)
                            res.render('error', { user: req.user, error: { message: 'Unable to complete requested update.', status: 500 }})
                        }
                    }
                    break
                case 'edit':
                    return await badRequest(req, res, 'ad', 501, 'Functionality not implemented', 'info')
                    break
                default:
                    return await badRequest(req, res, 'ad', 400, 'Invalid address.')
                    break
            }

        }
    }
}

// Add email address form handler
let emailAddHandler = async (req, res) => {
    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/user/account/?show=pr', 'You must be signed in.')
        return
    } else {
        let u = {}

        let formValidated = false
        let formFields = {}

        if (!req.body) {
            await badRequest(req, res, 'em', 400, 'Invalid request.')
            return
        }

        let form = converter.objectFieldsToString(req.body)

        if (form.uid != req.user.id.toString()) {
            _403redirect(req, res, '/user/account/?show=em', 'Permission denied.')
            return
        }

        // Read existing stored user details
        const usr = await user.read(form.uid, { findBy: 'id' })

        u.preferredUsername = usr.preferredUsername

        //Validate email address
        if (validator.isEmailAddress(form.email)) {
            let hasEmailAlready = getField(usr.emails, form.email)
            if (hasEmailAlready) {
                formValidated = false
                formFields.messages = { error: 'Cannot add duplicate email address.' }
                formFields.status = 400
            } else {
                /*
                u.emails = usr.emails
                u.emails ? u.emails.push({ value: form.email }) : u.emails = [{ value: form.email, primary: true }]
                */
                formValidated = true
            }
        } else {
            formValidated = false
            formFields.email = {class: 'invalid', value: form.email}
            formFields.messages = {
                error: 'You must enter a valid email address.'}
        }

        if (!formValidated) {
            if (debug) {
                console.log('Invalid update account request received.')
            }
            if (!formFields.messages) formFields.messages = { error: 'Request could not be fulfilled.' }
            let viewData = await accounthandler.populateUserViewData(req.user.id.toString())
            viewData.user = req.user
            viewData.pane = 'em'
            viewData.messages = formFields.messages
            viewData.email = formFields.email
            formFields.status ? res.status(formFields.status) : res.status(400)
            res.render('account', viewData)
            return
        } else {
            try {
                //await user.update({ preferredUsername: u.preferredUsername }, u)
                let u_emailaddhandler = await accounthandler.emailAddHandler(form)
                // TODO: validation check on 'u_emailaddhandler' response to show response if added or not
                if (debug) console.log('User account updated for ' + u.preferredUsername)
                let viewData = await accounthandler.populateUserViewData(req.user.id.toString())
                viewData.user = req.user
                viewData.pane = 'em'
                viewData.messages = { success: 'Account updated.' }
                res.render('account', viewData)
            } catch (e) {
                console.error(e)
                res.status(500)
                res.render('error', { user: req.user, error: { message: 'Unable to complete requested update.', status: 500 }})
            }
        }
    }
}

// Delete email address form handler
let emailDeleteHandler = async (req, res) => {
    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/user/account/?show=em', 'You must be signed in.')
        return
    } else {
        let u = {}

        let formValidated = false
        let formFields = {}

        if (!req.body) {
            await badRequest(req, res, 'em', 400, 'Invalid request.')
            return
        }

        let form = converter.objectFieldsToString(req.body)

        if (form.uid != req.user.id.toString()) {
            _403redirect(req, res, '/user/account/?show=em', 'Permission denied.')
            return
        }

        // Read existing stored user details
        const usr = await user.read(form.uid, { findBy: 'id' })

        u.preferredUsername = usr.preferredUsername

        //Validate email address
        if (validator.isEmailAddress(form.email)) {
            let primaryEmailAddr = getPrimaryField(usr.emails)
            if (primaryEmailAddr) {
                if (primaryEmailAddr.value != form.email) {
                    formValidated = true
                } else {
                    formValidated = false
                    formFields.messages = { error: 'Cannot delete primary email address.' }
                    formFields.status = 403
                }
            } else {
                formValidated = true
            }
        } else {
            await badRequest(req, res, 'em', 400, 'Invalid request.')
            return
        }

        if (!formValidated) {
            if (debug) {
                console.log('Invalid account update request received.')
            }
            let viewData = await accounthandler.populateUserViewData(req.user.id.toString())
            viewData.user = req.user
            viewData.pane = 'em'
            if (!formFields.messages) formFields.messages = { error: 'Request could not be fulfilled.' }
            viewData.messages = formFields.messages
            formFields.status ? res.status(formFields.status) : res.status(400)
            res.render('account', viewData)
            return
        } else {
            try {
                //u.emails = removeFields(usr.emails, form.email)
                //await user.update({ preferredUsername: u.preferredUsername }, u)
                let u_emaildeletehandler = await accounthandler.emailDeleteHandler(form)
                // TODO: validation check on 'u_emaildeletehandler' response to show response if deleted or not

                if (debug) console.log('User account updated for ' + u.preferredUsername)
                let viewData = await accounthandler.populateUserViewData(req.user.id.toString())
                viewData.user = req.user
                viewData.pane = 'em'
                viewData.messages = { success: 'Account updated.' }
                res.render('account', viewData)
            } catch (e) {
                console.error(e)
                res.status(500)
                res.render('error', { user: req.user, error: { message: 'Unable to complete requested update.', status: 500 }} )
            }
        }
    }
}

// Add phone number form handler
let phoneAddHandler = async (req, res) => {
    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/user/account/?show=pr', 'You must be signed in.')
        return
    } else {
        let u = {}

        let formValidated = false
        let formFields = {}

        if (!req.body) {
            await badRequest(req, res, 'pn', 400, 'Invalid request.')
            return
        }

        let form = converter.objectFieldsToString(req.body)

        if (form.uid != req.user.id.toString()) {
            _403redirect(req, res, '/user/account/?show=em', 'Permission denied.')
            return
        }

        // Read existing stored user details
        const usr = await user.read(form.uid, { findBy: 'id' })

        u.preferredUsername = usr.preferredUsername

        //Validate email address
        if (validator.isPhoneNumber(form.phoneNumber)) {
            let hasPhoneNumberAlready = getField(usr.phoneNumbers, form.phoneNumber)
            if (hasPhoneNumberAlready) {
                formValidated = false
                formFields.messages = { error: 'Phone numbers must be unique.' }
                formFields.status = 400
            } else {
                u.phoneNumbers = usr.phoneNumbers
                u.phoneNumbers ? u.phoneNumbers.push({ value: form.phoneNumber, type: form.phoneType }) : u.phoneNumbers = [{ value: form.phoneNumber, type: form.phoneType, primary: true }]
                formValidated = true
            }
        } else {
            formValidated = false
            formFields.phoneNumber = { class: 'invalid', value: form.phoneNumber }
            formFields.messages = {
                error: 'You must enter a valid phone number.'
            }
        }

        if (!formValidated) {
            if (debug) {
                console.log('Invalid update account request received.')
            }
            if (!formFields.messages) formFields.messages = { error: 'Request could not be fulfilled.' }
            let viewData = await accounthandler.populateUserViewData(req.user.id.toString())
            viewData.user = req.user
            viewData.pane = 'pn'
            viewData.messages = formFields.messages
            viewData.phoneNumber = formFields.phoneNumber
            formFields.status ? res.status(formFields.status) : res.status(400)
            res.render('account', viewData)
            return
        } else {
            try {
                //await user.update({ preferredUsername: u.preferredUsername }, u)
                let u_phoneaddhandler = await accounthandler.phoneAddHandler(form)
                // TODO: validation check on 'u_phoneaddhandler' response to show response if added or not

                if (debug) console.log('User account updated for ' + u.preferredUsername)
                let viewData = await accounthandler.populateUserViewData(req.user.id.toString())
                viewData.user = req.user
                viewData.pane = 'pn'
                viewData.messages = { success: 'Account updated.' }
                res.render('account', viewData)
            } catch (e) {
                console.error(e)
                res.status(500)
                res.render('error', {  user: req.user, error: {message: 'Unable to complete requested update.', status: 500 }})
            }
        }
    }
}

// Delete phone number form handler
let phoneDeleteHandler = async (req, res) => {
    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/user/account/?show=em', 'You must be signed in.')
        return
    } else {
        let u = {}

        let formValidated = false
        let formFields = {}

        if (!req.body) {
            await badRequest(req, res, 'pn', 400, 'Invalid request.')
            return
        }

        let form = converter.objectFieldsToString(req.body)

        if (form.uid != req.user.id.toString()) {
            _403redirect(req, res, '/user/account/?show=em', 'Permission denied.')
            return
        }

        // Read existing stored user details
        const usr = await user.read(form.uid, { findBy: 'id' })

        u.preferredUsername = usr.preferredUsername

        //Validate phone address
        if (validator.isPhoneNumber(form.phoneNumber)) {
            formValidated = true
        } else {
            await badRequest(req, res, 'pn', 400, 'Invalid request.')
            return
        }

        if (!formValidated) {
            if (debug) {
                console.log('Invalid account update request received.')
            }
            let viewData = await accounthandler.populateUserViewData(req.user.id.toString())
            viewData.user = req.user
            viewData.pane = 'pn'
            if (!formFields.messages) formFields.messages = { error: 'Request could not be fulfilled.' }
            viewData.messages = formFields.messages
            formFields.status ? res.status(formFields.status) : res.status(400)
            res.render('account', viewData)
            return
        } else {
            try {
                //u.phoneNumbers = removeFields(usr.phoneNumbers, form.phoneNumber)
                //await user.update({ preferredUsername: u.preferredUsername }, u)
                let u_phonedeletehandler = await accounthandler.phoneDeleteHandler(form)
                // TODO: validation check on 'u_phonedeletehandler' response to show response if delete or not

                if (debug) console.log('User account updated for ' + u.preferredUsername)
                let viewData = await accounthandler.populateUserViewData(req.user.id.toString())
                viewData.user = req.user
                viewData.pane = 'pn'
                viewData.messages = { success: 'Account updated.' }
                res.render('account', viewData)
            } catch (e) {
                console.error(e)
                res.status(500)
                res.render('error', { user: req.user, error: { message: 'Unable to complete requested update.', status: 500  }})
            }
        }
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
            //let u = await user.read(req.body.uid,{findBy: 'id'})
            //const deleted = await user.delete({preferredUsername: u.preferredUsername})
            let u_deletehandler = await accounthandler.deleteHandler(req.body.uid)
            // TODO: validation check on 'u_deletehandler' response to show response if delete or not

            //req.logout()
            if(u_deletehandler.deletedCount > 0){
                req.logout()
                if (req.session) {
                    let bagCurrency = await currency.read({ code: cfg.base_currency_code }, { limit: 1 })

                    if (!currency.isValid(bagCurrency)) {
                        let currencyError = new Error('Unable to set base currency')
                        throw currencyError
                    }

                    req.session.bag = new ShoppingBag(null, bagCurrency)
                    res.locals.bag = req.session.bag
                }
                res.local =  {messages: { success: 'Account deleted.' }}
                res.redirect('/')
            } else {
                let e = new Error('Deletion failed')
                e.name = 'UserError'
                e.type = 'Delete Operation'
                throw e
            }
        } catch (e) {
            console.error(e)
            res.status(500)
            let viewData = await accounthandler.populateUserViewData(req.user.id.toString())
            viewData.user = req.user
            viewData.pane = 'pr'
            viewData.messages = { error: 'Unable to delete account.' }
            res.render('account', viewData)
        }
    }

}

// Create package pre-alert
let packagePreAlertHandler = async (req, res) => {
    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/user/account/?show=pr', 'You must be signed in.')
        return
    } else {
        let u = {}

        let formValidated = false
        let formFields = {}

        if (!req.body) {
            await badRequest(req, res, 'pn', 400, 'Invalid request.')
            return
        }

        let form = converter.objectFieldsToString(req.body)

        if (form.uid != req.user.id.toString()) {
            _403redirect(req, res, '/user/account/?show=pkg', 'Permission denied.')
            return
        }

        // Read existing stored user details
        const usr = await user.read(form.uid, { findBy: 'id' })

        u.preferredUsername = usr.preferredUsername

        //Validate email address
        if (validator.isPhoneNumber(form.phoneNumber)) {
            let hasPhoneNumberAlready = getField(usr.phoneNumbers, form.phoneNumber)
            if (hasPhoneNumberAlready) {
                formValidated = false
                formFields.messages = { error: 'Phone numbers must be unique.' }
                formFields.status = 400
            } else {
                u.phoneNumbers = usr.phoneNumbers
                u.phoneNumbers ? u.phoneNumbers.push({ value: form.phoneNumber, type: form.phoneType }) : u.phoneNumbers = [{ value: form.phoneNumber, type: form.phoneType, primary: true }]
                formValidated = true
            }
        } else {
            formValidated = false
            formFields.phoneNumber = { class: 'invalid', value: form.phoneNumber }
            formFields.messages = {
                error: 'You must enter a valid phone number.'
            }
        }

        if (!formValidated) {
            if (debug) {
                console.log('Invalid update account request received.')
            }
            if (!formFields.messages) formFields.messages = { error: 'Request could not be fulfilled.' }
            let viewData = await accounthandler.populateUserViewData(req.user.id.toString())
            viewData.user = req.user
            viewData.pane = 'pn'
            viewData.messages = formFields.messages
            viewData.phoneNumber = formFields.phoneNumber
            formFields.status ? res.status(formFields.status) : res.status(400)
            res.render('account', viewData)
            return
        } else {
            try {
                //await user.update({ preferredUsername: u.preferredUsername }, u)
                let u_phoneaddhandler = await accounthandler.phoneAddHandler(form)
                // TODO: validation check on 'u_phoneaddhandler' response to show response if added or not

                if (debug) console.log('User account updated for ' + u.preferredUsername)
                let viewData = await accounthandler.populateUserViewData(req.user.id.toString())
                viewData.user = req.user
                viewData.pane = 'pn'
                viewData.messages = { success: 'Account updated.' }
                res.render('account', viewData)
            } catch (e) {
                console.error(e)
                res.status(500)
                res.render('error', { user: req.user, error: { message: 'Unable to complete requested update.', status: 500 } })
            }
        }
    }
}

account.get('/', async (req, res) => {
    try {
        if (validator.hasActiveSession(req)) {
            let qd = req.query
            let panel = 'pkg'
            if(qd) {
                switch(qd.show){
                    case 'ls':
                    case 'ad':
                    case 'em':
                    case 'pn':
                    case 'or':
                    case 'pm':
                    case 'pr':
                        panel = qd.show
                        break
                    default:
                        panel = 'pkg'
                }
            }
            let viewData = await accounthandler.populateUserViewData(req.user.id.toString())
            viewData.user = req.user
            viewData.pane = panel
            res.render('account', viewData)
        } else {
            messages = {error: "You need to be signed in."}
            res.status(403)
            res.render('signin', {messages: messages})
        }
    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { status: 500, error: {message: 'Error retrieving account data'} , name: '', user: req.user })

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
                case 'add-em':
                    await emailAddHandler(req, res)
                    break
                case 'add-pn':
                    await phoneAddHandler(req, res)
                    break
                case 'add-addr':
                    await naFormHandler(req, res)
                    break
                case 'del':
                    await deleteHandler(req,res)
                    break
                case 'del-em':
                    await emailDeleteHandler(req, res)
                    break
                case 'del-pn':
                    await phoneDeleteHandler(req, res)
                    break
                case 'upaddr':
                    await addressUpdateHandler(req, res)
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
                case 'pkg-prealert':
                    await packagePreAlertHandler(req, res)
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
        res.render('error', { error: {status: 500, message: 'Account update error'}, name: '', user: req.user })
    }
})

module.exports = account

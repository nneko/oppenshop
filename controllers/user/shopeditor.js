const cfg = require('../../configuration')
const validator = require('../../utilities/validator')
const shop = require('../../models/shop')
const express = require('express')
const converter = require('../../utilities/converter')
const generator = require('../../utilities/generator')
const media = require('../../adapters/storage/media')
const debug = cfg.env == 'development' ? true : false
const { removePrimaryFields } = require('../../utilities/generator')
const fileUploader = media.uploader()

let shopeditor = express.Router()

// Render view for bad request
let badRequest = async (req, res, show, status, msg, msgType, shopid) => {

    typeof (status) === 'number' ? res.status(status) : res.status(400);

    let mtype = 'error'

    typeof (msgType) === 'undefined' ? mtype = 'error' : mtype = msgType;

    let mObj = {}
    mObj[mtype] = msg ? msg : 'Invalid request.'

    try {
        let viewData = await populateViewData(shopid)
        viewData.user = req.user
        viewData.pane = typeof (show) == 'string' && show !== "" ? show : 'disabled'
        viewData.messages = mObj
        res.render('edit_storefront', viewData)
    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { user: req.user, messages: { error: 'Internal error due to bad request' } })
    }
}

// Render account view for bad request
let _403redirect = (req, res, url, msg) => {
    let verifiedUser = undefined
    res.status(403);
    res.render('signin', { url: url, messages: { error: msg ? msg : 'You must be signed in.' }, verifiedUser: verifiedUser })
}

let populateViewData = async (id) => {
    return new Promise(async (resolve, reject) => {
        try {

            let s = await shop.read(id,{findBy: 'id'})
            let viewData = {}

            if (s) {
                viewData.id = s._id
                viewData.name = {value: s.displayName}
                viewData.description = s.description ? { value: s.description } : undefined
                viewData.image = { value: generator.getPrimaryField(s.images) }
                if (!viewData.image.value && s.images && Array.isArray(s.images) && s.images.length > 0) {
                    viewData.image = { value: s.images[0] }
                    viewData.image.value.src = media.read(viewData.image.value)
                }
                viewData.address = generator.getPrimaryField(s.addresses)
                if(!viewData.address && s.addresses && Array.isArray(s.addresses) && s.addresses.length > 0) {
                    viewData.address = s.addresses[0]
                }
                if (viewData.address) {
                    viewData.addressType = { value: viewData.address.type }
                    viewData.addressStreet = { value: viewData.address.streetAddress }
                    viewData.addressLocality = { value: viewData.address.locality }
                    viewData.addressRegion = { value: viewData.address.region }
                    viewData.addressPostcode = { value: viewData.address.postalCode }
                    viewData.addressCountry = { value: viewData.address.country }
                }

                viewData.phoneNumber = generator.getPrimaryField(s.phoneNumbers)
                if (!viewData.phoneNumber && s.phoneNumbers && Array.isArray(s.phoneNumbers) && s.phoneNumbers.length > 0) {
                    viewData.phoneNumber = s.phoneNumbers[0] ? s.phoneNumbers[0] : undefined
                }
            }
            resolve(viewData)
        } catch (e) {
            reject(e)
        }
    })
}

shopeditor.get('/', async (req, res) => {
    try {
        if (validator.hasActiveSession(req)) {
            if (req.query && req.query.s) {
                try {
                    let viewData = await populateViewData(req.query.s)
                    viewData.user = req.user
                    console.log(viewData)
                    res.render('edit_storefront', viewData)
                } catch (e) {
                    console.error(e)
                    await badRequest(req, res, 'disabled', 404,'Unable to retrieve data for shop '+req.query.s)
                }
            } else {
                console.log('Bad request query')
                console.error(req.query)
                await badRequest(req,res,'disabled',400, 'Bad request.')
            }
        } else {
            messages = { error: "You need to be signed in." }
            res.status(403)
            res.render('signin', { messages: messages })
        }
    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Error retrieving data' }, name: '', user: req.user })

    }
})

shopeditor.post('/', fileUploader, async (req, res) => {
    try {
        if (validator.hasActiveSession(req)) {
            let form = converter.objectFieldsToString(req.body)

            let formValidated = false
            let formFields = {}

            if (!req.body) {
                await badRequest(req, res, 'disabled', 400, 'Invalid request.')
                return
            }

            if (form.uid != req.user.id.toString()) {
                _403redirect(req, res, '/user/shop/?show=sf', 'Permission denied.')
                return
            }

            if (!validator.isNotNull(form.id)) {
                await badRequest(req, res, '', 400, 'Invalid shop id.')
                return
            }

            let s = await shop.read(form.id, {findBy: 'id'})

            let shopUpdate = {}

            if (!validator.isNotNull(form.name)) {
                formFields.name = { class: 'is-invalid', value: form.name }
                formFields.name = { class: 'is-invalid', value: form.displayName }
            } else {
                shopUpdate.name = form.name
                shopUpdate.displayName = form.name
                formFields.name = { class: 'valid', value: form.name }
                formFields.name = { class: 'valid', value: form.displayName }
            }

            if(validator.isNotNull(form.description)) {
                shopUpdate.description = form.description
                formFields.description = {class: 'valid', value: shopUpdate.description}
            } else {
                formFields.description = { class: 'is-valid', value: form.description }
            }

            if (req.files && Array.isArray(req.files)) {
                if (validator.isUploadLimitExceeded(req.files)) {
                    await badRequest(req, res, '', 403, 'Upload limits exceeded.')
                    return
                }
                if(req.files.length > 0) {
                    let sImgs = []
                    for (x of req.files) {
                        let img = {}
                        x.storage = cfg.media_datastore ? cfg.media_datastore : 'db'
                        if(x.storage != 'db') {
                            img = await media.write(x, (cfg.media_dest_shops ? cfg.media_dest_shops : '/shop') + '/' + String(s._id) + '/' + (x.originalname ? x.originalname : generator.uuid()))
                        } else {
                            img = x
                        }
                        sImgs.push(img)
                    }
                    shopUpdate.images = sImgs
                }
            }

            let addr = {}
            addr.type = form.addressType
            addr.streetAddress = form.addressStreet
            addr.locality = form.addressLocality
            addr.region = form.addressRegion
            addr.postalCode = form.addressPostcode
            addr.country = form.addressCountry
            addr.formatted = generator.formattedAddress(addr)
            addr.primary = true
            
            if (validator.isAddress(addr)) {
                if (typeof (s.addresses) !== 'undefined') {
                    // Current implementation only supports a single primary address per shop
                    /*
                    shopUpdate.addresses = generator.removePrimaryFields(s.addresses)
                    shopUpdate.addresses.push(addr)
                    */
                    shopUpdate.addresses = [addr]
                } else {
                    shopUpdate.addresses = [addr]
                }
            } else {
                formFields.addressType = { class: 'is-invalid', value: form.addressType }
                formFields.addressStreet = { class: 'is-invalid', value: form.addressStreet }
                formFields.addressLocality = { class: 'is-invalid', value: form.addressLocality }
                formFields.addressRegion = { class: 'is-invalid', value: form.addressRegion }
                formFields.addressPostcode = { class: 'is-invalid', value: form.addressPostcode }
                formFields.addressCountry = { class: 'is-invalid', value: form.addressCountry }
            }

            //Validate phone
            if (validator.isNotNull(form.phoneNumber) && validator.isPhoneNumber(form.phoneNumber)) {

                s.phoneNumbers ? shopUpdate.phoneNumbers = s.phoneNumbers : shopUpdate.phoneNumbers = [];

                let primaryPhone = {
                    value: form.phoneNumber,
                    type: form.phoneType || "work",
                    primary: true
                }
                // Current implementation supports only a single phone number per shop
                /*
                shopUpdate.phoneNumbers = removePrimaryFields(shopUpdate.phoneNumbers)
                shopUpdate.phoneNumbers.push(primaryPhone)
                */
                shopUpdate.phoneNumbers = [primaryPhone]

                formFields.phone = { class: 'valid', value: form.phone }
            }

            let hasInvalids = false;

            for (const k of Object.keys(formFields)) {
                if (typeof (formFields[k].class) === 'undefined' || formFields[k].class == 'is-invalid') {
                    hasInvalids = true
                    break
                }
            }

            hasInvalids ? formValidated = false : formValidated = true

            if (formValidated) {
                if(debug) console.log(shopUpdate)
                await shop.update({name: s.name},shopUpdate)
                let viewData = {}
                viewData = await populateViewData(s._id)
                viewData.user = req.user
                viewData.messages = {success: 'Shop updated.'}
                res.render('edit_storefront', viewData)
            } else {
                let viewData = {}
                viewData = await populateViewData(s._id)
                for (const k of Object.keys(formFields)) {
                    viewData[k] = formFields[k]
                }
                viewData.user = req.user
                viewData.messages = { error: 'Shop update unsucessful. One or more invalid field entries.' }
                res.render('edit_storefront', viewData)
            }
        } else {
            _403redirect(req, res, '/user/shop', 'You need to be signed in.')
        }
    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Shop editor error' }, name: '', user: req.user })
    }
})

module.exports = shopeditor
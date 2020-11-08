const cfg = require('../../configuration')
const validator = require('../../utilities/validator')
const catalog = require('../../models/catalog')
const express = require('express')
const converter = require('../../utilities/converter')
const media = require('../../adapters/storage/media')
const debug = cfg.env == 'development' ? true : false
const fileUploader = media.uploader()

let catalogeditor = express.Router()

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
        res.render('edit_catalog', viewData)
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

            let c = await catalog.read(id,{findBy: 'id'})
            let viewData = {}

            if (c) {
                viewData.id = c._id
                viewData.name = {value: c.displayName ? c.displayName : c.name}
                viewData.description = c.description ? { value: c.description } : undefined
                viewData.image = { value: c.image }
                if (viewData.image.value ) {
                    viewData.image.value.src = media.read(viewData.image.value)
                }
            }
            resolve(viewData)
        } catch (e) {
            reject(e)
        }
    })
}

catalogeditor.get('/', async (req, res) => {
    try {
        if (validator.hasActiveSession(req)) {
            if (req.query && req.query.c) {
                try {
                    let viewData = await populateViewData(req.query.c)
                    viewData.user = req.user
                    console.log(viewData)
                    res.render('edit_catalog', viewData)
                } catch (e) {
                    console.error(e)
                    await badRequest(req, res, 'disabled', 404,'Unable to retrieve data for catalog '+req.query.c)
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

catalogeditor.post('/', fileUploader, async (req, res) => {
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
                _403redirect(req, res, '/user/shop/?show=cl', 'Permission denied.')
                return
            }

            if (!validator.isNotNull(form.id)) {
                await badRequest(req, res, '', 400, 'Invalid catalog id.')
                return
            }

            let c = await catalog.read(form.id, {findBy: 'id'})

            let catalogUpdate = {}

            if (!validator.isNotNull(form.name)) {
                formFields.name = { class: 'is-invalid', value: form.name }
                formFields.name = { class: 'is-invalid', value: form.displayName }
            } else {
                catalogUpdate.name = form.name
                catalogUpdate.displayName = form.name
                formFields.name = { class: 'valid', value: form.name }
                formFields.name = { class: 'valid', value: form.displayName }
            }

            if(validator.isNotNull(form.description)) {
                catalogUpdate.description = form.description
                formFields.description = {class: 'valid', value: catalogUpdate.description}
            } else {
                formFields.description = { class: 'is-valid', value: form.description }
            }

            if (req.files && Array.isArray(req.files)) {
                if (validator.isUploadLimitExceeded(req.files)) {
                    await badRequest(req, res, '', 403, 'Upload limits exceeded.')
                    return
                }
                if (req.files.length > 0) {
                    let img = req.files[0]
                    x.storage = cfg.media_datastore ? cfg.media_datastore : 'db'
                    if (x.storage != 'db') {
                        img = await media.write(x, (cfg.media_dest_catalogs ? cfg.media_dest_catalogs : '/catalog') + '/' + String(s._id) + '/' + (x.originalname ? x.originalname : generator.uuid()))
                    } else {
                        img = x
                    }
                    catalogUpdate.image = img
                }
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
                if(debug) console.log(catalogUpdate)
                await catalog.update({name: c.name},catalogUpdate)
                let viewData = {}
                viewData = await populateViewData(c._id)
                viewData.user = req.user
                viewData.messages = {success: 'Catalog updated.'}
                res.render('edit_catalog', viewData)
            } else {
                let viewData = {}
                viewData = await populateViewData(c._id)
                for (const k of Object.keys(formFields)) {
                    viewData[k] = formFields[k]
                }
                viewData.user = req.user
                viewData.messages = { error: 'Catalog update unsucessful. One or more invalid field entries.' }
                res.render('edit_catalog', viewData)
            }
        } else {
            _403redirect(req, res, '/user/shop', 'You need to be signed in.')
        }
    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Catalog editor error' }, name: '', user: req.user })
    }
})

module.exports = catalogeditor
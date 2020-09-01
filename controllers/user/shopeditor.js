const cfg = require('../../configuration')
const validator = require('../../utilities/validator')
const user = require('../../models/user')
const shop = require('../../models/shop')
const express = require('express')
const converter = require('../../utilities/converter')
const generator = require('../../utilities/generator')
const media = require('../../adapters/storage/media')
const debug = cfg.env == 'development' ? true : false
//const passport = require('passport')
const multer = require('multer')
const storage = multer.memoryStorage()
var upload = multer({
    storage: storage,
    onError: function (err, next) {
        console.log('error', err);
        next(err);
    }
}).array('fullimage', 10)

let shopeditor = express.Router()

// Render view for bad request
let badRequest = async (req, res, show, status, msg, msgType) => {

    typeof (status) === 'number' ? res.status(status) : res.status(400);

    let mtype = 'error'

    typeof (msgType) === 'undefined' ? mtype = 'error' : mtype = msgType;

    let mObj = {}
    mObj[mtype] = msg ? msg : 'Invalid request.'

    try {
        let viewData = await populateViewData(req.user.id)
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
                }
                viewData.address = {value: generator.getPrimaryField(s.addresses)}
                if(!viewData.address.value && s.addresses && Array.isArray(s.addresses) && s.addresses.length > 0) {
                    viewData.address = {value: s.addresses[0]}
                }
                if (viewData.address.value) {
                    viewData.addressType = { value: viewData.address.addressType }
                    viewData.addressStreet = { value: viewData.address.addressStreet }
                    viewData.addressState = { value: viewData.address.addressState }
                    viewData.addressRegion = { value: viewData.address.addressRegion }
                    viewData.addressLocality = { value: viewData.address.addressLocality }
                    viewData.addressPostcode = { value: viewData.address.addressPostcode }
                    viewData.addressCountry = { value: viewData.address.addressCountry }
                }
                if (viewData.address && !viewData.address.value) viewData.address = undefined
                viewData.phoneNumber = {value: generator.getPrimaryField(s.phoneNumbers)}
                if (!viewData.phoneNumber.value && s.phoneNumbers && Array.isArray(s.phoneNumbers) && s.phoneNumbers.length > 0) {
                    viewData.phoneNumber = s.phoneNumbers[0] ? {value: s.phoneNumbers[0]} : undefined
                }
                if(viewData.phoneNumber && !viewData.phoneNumber.value) viewData.phoneNumber = undefined
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
                    console.log('Bad request query')
                    console.error(req.query)
                    await badRequest(req, res, 'disabled', 404,'Unable to retrieve data for shop '+req.query.s)
                }
            } else {
                console.log('Bad request query')
                console.error(req.query)
                await badRequest(req,res,'disabled',400)
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

shopeditor.post('/', function (req, res) {
    upload(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            console.error('A Multer error occurred when uploading.')
            console.error(err.stack)
            res.status(500)
            res.render('error', { error: { status: 500, message: 'File Upload Error' }, name: '', user: req.user })
            //return
        } else if (err) {
            console.error('An unknown error occurred when uploading.')
            console.error(err.stack)
            res.status(500)
            res.render('error', { error: { status: 500, message: 'An Unknown Error occurred' }, name: '', user: req.user })
            //return
        } else {
            //console.log('Second')
            //console.log(req.body)
            //console.log(req.files)
            try {
                if (validator.hasActiveSession(req)) {
                    let form = req.body
                    let viewData = {}
                    viewData.user = req.user
                    res.render('edit_storefront', viewData)
                } else {
                    _403redirect(req, res, '/user/shop', 'You need to be signed in.')
                }
            } catch (e) {
                console.error(e)
                res.status(500)
                res.render('error', { error: { status: 500, message: 'Shop editor error' }, name: '', user: req.user })
            }
        }
    })
})

module.exports = shopeditor
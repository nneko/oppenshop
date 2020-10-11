const cfg = require('../../configuration')
const validator = require('../../utilities/validator')
const user = require('../../models/user')
const shop = require('../../models/shop')
const product = require('../../models/product')
const currency = require('../../models/currency')
const express = require('express')
const converter = require('../../utilities/converter')
const generator = require('../../utilities/generator')
const media = require('../../adapters/storage/media')
const debug = cfg.env == 'development' ? true : false
//const passport = require('passport')
const multer = require('multer')
const { removePrimaryFields } = require('../../utilities/generator')
const storage = multer.memoryStorage()
const fileUploader = multer({
    storage: storage,
    onError: function (err, next) {
        console.log('error', err);
        next(err);
    }
}).array('fullimage', 10)
const idx = cfg.indexerAdapter ? require('../../adapters/indexer/' + cfg.indexerAdapter) : null
const productIdx = cfg.indexerProductIndex ? cfg.indexerProductIndex : 'products-index'

let producteditor = express.Router()

// Render view for bad request
let badRequest = async (req, res, show, status, msg, msgType, productid) => {

    typeof (status) === 'number' ? res.status(status) : res.status(400);

    let mtype = 'error'

    typeof (msgType) === 'undefined' ? mtype = 'error' : mtype = msgType;

    let mObj = {}
    mObj[mtype] = msg ? msg : 'Invalid request.'

    try {
        let viewData = await populateViewData(productid)
        viewData.user = req.user
        viewData.pane = typeof (show) == 'string' && show !== "" ? show : 'disabled'
        viewData.messages = mObj
        res.render('edit_product', viewData)
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

            //let s = await shop.read(id,{findBy: 'id'})
            let p = await product.read(id,{findBy: 'id'})
            let viewData = {}

            if (p) {
                viewData.id = p._id
                viewData.name = { value: p.name }
                viewData.displayName = { value: p.displayName }
                viewData.description = p.description ? { value: p.description } : undefined
                viewData.image = { value: generator.getPrimaryField(p.images) }
                if (!viewData.image.value && p.images && Array.isArray(p.images) && p.images.length > 0) {
                    viewData.image = { value: p.images[0] }
                    viewData.image.value.src = media.getBinaryDetails(viewData.image.value)
                }
                viewData.quantity = {value: p.quantity}
                if (typeof(p.price) !== 'undefined'){
                  amount = p.price.split(".")
                  viewData.unit_dollar = {value: amount[0]}
                  viewData.unit_cents = {value: amount[1]}
                  viewData.currencyid = {value: p.currencyid}
                  let curr = await currency.read(p.currencyid,{findBy: 'id'})
                  viewData.currency = {
                    id: curr._id,
                    value: curr.code
                  }
                }
                let specs = {}
                if (typeof(p.specifications) !== 'undefined' ){
                  for (key in p.specifications){
                    specs[key] = {value: p.specifications[key]}
                    //specs[key.replace('spec_', '')] = form[key]
                    //p[key] = form[key]
                    //console.log(key, form[key])
                    //console.log(key.replace('spec_', ''), form[key])
                  }
                  console.log(typeof(specs))
                  console.log(specs)
                  viewData.specifications = specs
                }

                /*
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
                */
            }
            let c = await currency.read({status: 'active'})
            if (c) {
                if (Array.isArray(c)) {
                  viewData.currency_list = c
                }
            }
            resolve(viewData)
        } catch (e) {
            reject(e)
        }
    })
}

producteditor.get('/', async (req, res) => {
    try {
        if (validator.hasActiveSession(req)) {
            if (req.query && req.query.s) {
                try {
                    let viewData = await populateViewData(req.query.s)
                    viewData.user = req.user
                    console.log(viewData)
                    res.render('edit_product', viewData)
                } catch (e) {
                    console.error(e)
                    await badRequest(req, res, 'disabled', 404,'Unable to retrieve data for product '+req.query.s)
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

producteditor.post('/', function (req, res) {
    fileUploader(req, res, async function (err) {
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
            console.log(req.body)
            //console.log(req.files)
            try {
                if (validator.hasActiveSession(req)) {
                    let form = converter.objectFieldsToString(req.body)

                    let formValidated = false
                    let formFields = {}

                    if (!req.body) {
                        await badRequest(req, res, 'disabled', 400, 'Invalid request.')
                        return
                    }

                    if (form.uid != req.user.id) {
                        _403redirect(req, res, '/user/shop/?show=sf', 'Permission denied.')
                        return
                    }

                    if (!validator.isNotNull(form.id)) {
                        await badRequest(req, res, '', 400, 'Invalid product id.')
                        return
                    }

                    //let s = await shop.read(form.id, {findBy: 'id'})
                    let p = await product.read(form.id, {findBy: 'id'})

                    //let shopUpdate = {}
                    let productUpdate = {}

                    if (!validator.isNotNull(form.name)) {
                        formFields.name = { class: 'is-invalid', value: form.name }
                        //formFields.name = { class: 'is-invalid', value: form.displayName }
                    } else {
                        //shopUpdate.name = form.name
                        productUpdate.name = form.name
                        //shopUpdate.displayName = form.name
                        productUpdate.displayName = form.name
                        formFields.name = { class: 'valid', value: form.name }
                        formFields.name = { class: 'valid', value: form.displayName }
                    }
                    /*
                    if(validator.isNotNull(form.description)) {
                        shopUpdate.description = form.description
                        formFields.description = {class: 'valid', value: shopUpdate.description}
                    } else {
                        formFields.description = { class: 'is-valid', value: form.description }
                    }
                    */
                    if (req.files && Array.isArray(req.files)) {
                        if (validator.isUploadLimitExceeded(req.files)) {
                            await badRequest(req, res, '', 403, 'Upload limits exceeded.')
                            return
                        }
                        if(req.files.length > 0) {
                            for (x of req.files) {
                                x.storage = 'db'
                            }
                            if(debug) console.log(req.files)
                            //shopUpdate.images = req.files
                            productUpdate.images = req.files
                        }
                    }
                    productUpdate.quantity = form.quantity ? Number(form.quantity) : 0
                    productUpdate.price = generator.roundNumber( form.unit_dollar && form.unit_cents ? Number(form.unit_dollar + '.' + form.unit_cents): 0, 2)
                    //productUpdate.currency = form.currency ? form.currency : 'JMD'
                    productUpdate.currencyid = form.currency
                    if (form.name !== 'undefined'){
                      productUpdate.displayName = form.name

                    }
                    let specs = {}
                    for (const ky of Object.keys(form)){
                      if (!ky.startsWith('spec_')) continue
                      specs[ky.replace('spec_', '')] = form[ky]
                      //p[key] = form[key]
                      //console.log(key, form[key])
                      //console.log(key.replace('spec_', ''), form[key])
                    }
                    productUpdate.specifications = specs


                    let hasInvalids = false;

                    for (const k of Object.keys(formFields)) {
                        if (typeof (formFields[k].class) === 'undefined' || formFields[k].class == 'is-invalid') {
                            hasInvalids = true
                            break
                        }
                    }

                    hasInvalids ? formValidated = false : formValidated = true

                    if (formValidated) {

                        let updated = await product.update({name: p.name},productUpdate)

                        try {
                            let updatedProduct = await product.read(p._id,{findBy: 'id'})
                            if(await product.isValid(updatedProduct)) {
                                    let idx_res = await idx.updateMatches(productIdx, {
                                        ref: p._id
                                    }, {
                                        'replacement-values': {
                                            name: updatedProduct.name,
                                            displayName: updatedProduct.displayName,
                                            description: updatedProduct.description,
                                            specifications: updatedProduct.specifications,
                                            price: updatedProduct.price,
                                            currency: updatedProduct.currency,
                                            status: updatedProduct.status
                                        }
                                    })
                                    if (debug) {
                                        console.log('Indexer response ' + JSON.stringify(idx_res))
                                    }
                            } else {
                                if(debug) {
                                    console.error('Skipping index update for invalid product entry ' + p._id)
                                }
                            }
                        } catch (err) {
                            console.log('Error on index update.')
                            console.error(err)
                            err.stack ? console.error(err.stack) : console.error('No stack trace.')
                        }
                        let viewData = {}
                        viewData = await populateViewData(p._id)
                        viewData.user = req.user
                        viewData.messages = {success: 'Product updated.'}
                        res.render('edit_product', viewData)
                    } else {
                        let viewData = {}
                        viewData = await populateViewData(p._id)
                        for (const k of Object.keys(formFields)) {
                            viewData[k] = formFields[k]
                        }
                        viewData.user = req.user
                        viewData.messages = { error: 'Product update unsucessful. One or more invalid field entries.' }
                        res.render('edit_product', viewData)
                    }
                } else {
                    _403redirect(req, res, '/user/shop', 'You need to be signed in.')
                }
            } catch (e) {
                console.error(e)
                res.status(500)
                res.render('error', { error: { status: 500, message: 'Product editor error' }, name: '', user: req.user })
            }
        }
    })
})

module.exports = producteditor

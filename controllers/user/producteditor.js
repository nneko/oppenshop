const cfg = require('../../configuration')
const validator = require('../../utilities/validator')
const product = require('../../models/product')
const currency = require('../../models/currency')
const express = require('express')
const converter = require('../../utilities/converter')
const generator = require('../../utilities/generator')
const media = require('../../adapters/storage/media')
const debug = cfg.env == 'development' ? true : false
const fileUploader = media.uploader()
const idx = cfg.indexerAdapter ? require('../../adapters/indexer/' + cfg.indexerAdapter) : null
const productIdx = cfg.indexerProductIndex ? cfg.indexerProductIndex : 'products-index'
const baseCurrencyCode = cfg.base_currency_code ? cfg.base_currency_code : 'USD'

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
            let productCurrency = await currency.read(p.currency, {findBy: 'id'})
            let productCurrencyCode = baseCurrencyCode
            if(currency.isValid(productCurrency)) {
                productCurrencyCode = productCurrency.code
            }
            let viewData = {}

            //Populate the currency list
            viewData.currency_list = {}
            let c = await currency.read({ status: 'active' })
            if (c) {
                if (Array.isArray(c)) {
                    for (let cIdx = 0; cIdx < c.length; cIdx++) {
                        if (currency.isValid(c[cIdx])) {
                            viewData.currency_list[c[cIdx]._id.toString()] = c[cIdx]
                        }
                    }
                }
            }

            if (p) {
                viewData.id = p._id
                viewData.name = { value: p.name }
                viewData.displayName = { value: p.displayName }
                viewData.description = p.description ? { value: p.description } : undefined
                viewData.image = { value: generator.getPrimaryField(p.images) }
                if (!viewData.image.value && p.images && Array.isArray(p.images) && p.images.length > 0) {
                    viewData.image = { value: p.images[0] }
                    viewData.image.value.src = media.read(viewData.image.value)
                }
                viewData.quantity = {value: p.quantity}
                if (typeof(p.price) !== 'undefined'){
                  amount = p.price.split(".")
                  viewData.unit_dollar = {value: amount[0]}
                  viewData.unit_cents = {value: amount[1]}
                  viewData.currency = {value: productCurrency}
                }
                let specs = {}
                if (typeof(p.specifications) !== 'undefined' ){
                  for (key in p.specifications){
                    specs[key] = {value: p.specifications[key]}
                  }
                  console.log(typeof(specs))
                  console.log(specs)
                  viewData.specifications = specs
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

producteditor.post('/', fileUploader, async (req, res) => {
    //console.log('Second')
    console.log(req.body)
    //console.log(req.files)
    try {
        if (validator.hasActiveSession(req)) {
            let form = converter.objectFieldsToString(req.body)

            let formValidated = false
            let formFields = {}
            let validationError = null

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
                    let pImgs = []
                    for (x of req.files) {
                        let img = {}
                        x.storage = cfg.media_datastore ? cfg.media_datastore : 'db'
                        if (x.storage != 'db') {
                            img = await media.write(x, '/product/' + String(s._id) + '/' + (x.originalname ? x.originalname : generator.uuid()))
                        } else {
                            img = x
                        }
                        pImgs.push(img)
                    }
                    productUpdate.images = pImgs
                }
            }
            productUpdate.quantity = form.quantity ? Number(form.quantity) : 0
            productUpdate.price = generator.roundNumber( form.unit_dollar && form.unit_cents ? Number(form.unit_dollar + '.' + form.unit_cents): 0, 2)

            let curr = await currency.read(form.currency, {findBy: 'id'})

            if (! currency.isValid(curr)) {
                console.error(form.currency)
                console.error(curr)
                let error = new Error('Invalid currency code')
                error.name = 'CurrencyError'
                error.type = 'Invalid'
                throw error
            }

            productUpdate.currency = curr._id.toString()
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

            let productCurrency = await currency.read(productUpdate.currency, { findBy: 'id' })

            if (cfg.minimum_price && cfg.minimum_price_currency) {
                try {
                    let minPrice = Number(cfg.minimum_price)
                    let minCurCode = String(cfg.minimum_price_currency)

                    let currencyExchangeRate = Number(productCurrency.exchangeRates[productCurrency.code])

                    if (isNaN(currencyExchangeRate)) {
                        console.error('Unable to do currency conversion for product: ')
                        console.error(currencyExchangeRate)
                        let eXError = new Error('Invalid exchange rate')
                        eXError.name = 'CurrencyExchangeRateError'
                        eXError.type = 'InvalidExchangeRate'
                        throw eXError
                    }

                    let productPriceInBase = (1 * (productUpdate.price / currencyExchangeRate))
                    let minPriceInBase = 1 * (minPrice / Number(productCurrency.exchangeRates[minCurCode]))

                    if (!(productPriceInBase >= minPriceInBase)) {
                        console.error('Product price lower than minimum allowed price')
                        console.error(generator.roundNumber(productPriceInBase, 2) + ' ' + productCurrency.exchangeBase)
                        console.error('Minimum allowed price: ')
                        console.error(generator.roundNumber(minPriceInBase, 2) + ' ' + productCurrency.exchangeBase)
                        let minPriceError = new Error('Below minimum')
                        minPriceError.name = 'PricingError'
                        minPriceError.type = 'InvalidPrice'
                        throw minPriceError
                    }
                } catch (e) {
                    if (e && e.name == 'CurrencyExchangeRateError') throw e
                    validationError = e
                    formFields.unit_dollar = { class: 'is-invalid', value: form.unit_dollar }
                    formFields.unit_cents = { class: 'is-invalid', value: form.unit_cents }
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

                let updated = await product.update({name: p.name},productUpdate)

                try {
                    let updatedProduct = await product.read(p._id,{findBy: 'id'})
                    if(await product.isValid(updatedProduct)) {

                        let productCurrencyCode = baseCurrencyCode

                        if(productCurrency && currency.isValid(productCurrency) && validator.isNotNull(productCurrency.code)) productCurrencyCode = productCurrency.code

                        let idx_res = await idx.updateMatches(productIdx, {
                            ref: p._id
                        }, {
                            'replacement-values': {
                                name: updatedProduct.name,
                                displayName: updatedProduct.displayName,
                                description: updatedProduct.description,
                                specifications: updatedProduct.specifications,
                                price: updatedProduct.price,
                                currency: productCurrencyCode,
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
                    if(err && err.meta && err.meta.body && err.meta.body.error) console.error(err.meta.body.error)
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

                if (validationError && validationError.type == 'InvalidPrice') {
                    console.log('Product pricing error detected.')
                    viewData.messages.error = 'Product unit price is below allowed minimum price of ' + cfg.minimum_price + ' ' + cfg.minimum_price_currency + '.'
                    if (viewData['unit_dollar']) viewData['unit_dollar'].class = 'is-invalid'
                    if (viewData['unit_cents']) viewData['unit_cents'].class = 'is-invalid'
                    res.status(400)
                } else if (validationError && validataionError.name == 'ProductError') {
                    console.log('Invalid product fields detected.')
                    viewData.messages.error = 'Product could not be registered due to one or more invalid entries. Please check the fields and try again.'
                    if (viewData['fullname']) viewData['fullname'].class = 'is-invalid'
                    if (viewData['description']) viewData['description'].class = 'is-invalid'
                    if (viewData['quantity']) viewData['quantity'].class = 'is-invalid'
                    if (viewData['unit_dollar']) viewData['unit_dollar'].class = 'is-invalid'
                    if (viewData['unit_cents']) viewData['unit_cents'].class = 'is-invalid'
                    res.status(400)
                }
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
})

module.exports = producteditor

const cfg = require('../../configuration')
const validator = require('../../utilities/validator')
const shop = require('../../models/shop')
const product = require('../../models/product')
const express = require('express')
const converter = require('../../utilities/converter')
const generator = require('../../utilities/generator')
const debug = cfg.env == 'development' ? true : false
const media = require('../../adapters/storage/media')
const fileUploader = media.uploader()
const catalog = require('../../models/catalog')
const shophandler = require('../handlers/shop')
const idx = cfg.indexerAdapter ? require('../../adapters/indexer/' + cfg.indexerAdapter) : null
const productIdx = cfg.indexerProductIndex ? cfg.indexerProductIndex : 'products-index'
const currency = require('../../models/currency')
const baseCurrencyCode = cfg.base_currency_code ? cfg.base_currency_code : 'USD'

let shops = express.Router()

let getPrimaryField = generator.getPrimaryField

// Render account view for bad request
let badRequest = async (req, res, show, status, msg, msgType) => {
    let verifiedUser = undefined

    typeof (status) === 'number' ? res.status(status) : res.status(400);

    let mtype = 'error'

    typeof (msgType) === 'undefined' ? mtype = 'error' : mtype = msgType;

    let mObj = {}
    mObj[mtype] = msg ? msg : 'Invalid request.'

    try {
        let viewData = await shophandler.populateViewData(req.user.id.toString())
        viewData.user = req.user
        viewData.pane = typeof(show) == 'string' && show !== "" ? show : 'sf'
        viewData.messages = mObj
        res.render('sell', viewData)
    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { user: req.user, error: { message: 'Internal error due to bad request', status: 500 } })
    }
}

// Render account view for bad request
let _403redirect = (req, res, url, msg) => {
    let verifiedUser = undefined
    res.status(403);
    res.render('signin', { url: url, messages: { error: msg ? msg : 'You must be signed in.' }, verifiedUser: verifiedUser })
}


let catalogAddHander = async (req, res) => {
    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/user/shop/?show=cl', 'You must be signed in.')
        return
    } else {
        try {
            let c = {}

            let formValidated = false
            let formFields = {}

            if (!req.body) {
                await badRequest(req, res, 'cl', 400, 'Invalid request.')
                return
            }

            let form = converter.objectFieldsToString(req.body)

            if (form.uid != req.user.id.toString()) {
                _403redirect(req, res, '/user/shop/?show=cl', 'Permission denied.')
                return
            }

            if (!validator.isNotNull(form.name)) {
                await badRequest(req, res, 'cl', 400, 'Catalogs must have a name.')
                return
            }

            const shp = await shop.read(form.sid, {findBy: 'id'})

            if (!((await shop.isValid(shp)) && shp.status == 'active')) {
                await badRequest(req, res, 'cl', 400, 'Catalogs must be associated with a valid and active shop.')
                return
            }

            if (req.files && validator.isUploadLimitExceeded(req.files)) {
                await badRequest(req, res, 'cl', 403, 'Upload limits exceeded.')
                return
            }

            let cAddResult = await shophandler.catalogAddHander(form,req.files)
            


            if (cAddResult) {
                let newCtg = await catalog.read({ name: form.name, owner: form.sid }, { limit: 1 })

                if (newCtg && await catalog.isValid(newCtg)) {
                    // Save catalog images
                    let cImgs = []
                    if (req.files && Array.isArray(req.files)) {
                        let cImgs = []
                        for (x of req.files) {
                            let img = {}
                            x.storage = cfg.media_datastore ? cfg.media_datastore : 'db'
                            if (x.storage != 'db') {
                                img = await media.write(x, (cfg.media_dest_products ? cfg.media_dest_products : '/catalog') + '/' + String(newCtg._id) + '/' + (x.originalname ? x.originalname : generator.uuid()))
                            } else {
                                img = x
                            }
                            cImgs.push(img)
                        }
                        newCtg.image = cImgs[0]
                    }
                    if (debug) console.log('Saving new catalog images')
                    let catalogImageSaveResult = await catalog.update({ name: String(form.name).toLowerCase(), owner: form.sid }, newShop)
                    if (debug) console.error(catalogImageSaveResult)
                }
            }

            if (debug) console.log('Catalog added for ' + shp.displayName)
            //let viewData = await shophandler.populateViewData('\''+u.uid+'\'')
            let viewData = await shophandler.populateViewData(req.user.id.toString())
            viewData.user = req.user
            viewData.pane = 'cl'
            viewData.messages = { success: 'Catalog created.' }
            res.render('sell', viewData)
            return
        } catch (e) {
            console.error(e)
            res.status(500)
            res.render('error', { user: req.user, error: { message: 'Unable to complete requested addition of a catalog.', status: 500 } })
            return
        }
    }
}

let catalogDeleteHander = async (req, res) => {
    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/user/shop/?show=cl', 'You must be signed in.')
        return
    } else {
        try {
            let formValidated = false
            let formFields = {}

            if (!req.body) {
                await badRequest(req, res, 'cl', 400, 'Invalid request.')
                return
            }

            let form = converter.objectFieldsToString(req.body)

            if (form.uid != req.user.id.toString()) {
                _403redirect(req, res, '/user/shop/?show=cl', 'Permission denied.')
                return
            }

            if (!validator.isNotNull(form.cid)) {
                await badRequest(req, res, 'cl', 400, 'Invalid request.')
                return
            }

            let ctg = await catalog.read(form.cid,{findBy: 'id'})

            if (! await catalog.isValid(ctg)) {
                await badRequest(req, res, 'cl', 404, 'Invalid request. Catalog not found.')
                return
            } else {
                let c_deletehandler = await shophandler.catalogDeleteHander(form)
                // TODO: validation check on 'c_deletehandler' response to show response if deleted or not

                let viewData = await shophandler.populateViewData(req.user.id.toString())
                viewData.user = req.user
                viewData.pane = 'cl'
                viewData.messages = { success: 'Catalog deleted.' }
                res.render('sell', viewData)
                return
            }
        } catch (e) {
            console.error(e)
            res.status(500)
            res.render('error', { user: req.user, error: { message: 'Unable to complete requested addition of a catalog.', status: 500 } })
            return
        }
    }
}

let catalogAddProductHander = async (req, res) => {
    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/user/shop/?show=cl', 'You must be signed in.')
        return
    } else {
        try {
            let c = {}
            c.products = []

            let formValidated = false
            let formFields = {}

            if (!req.body) {
                await badRequest(req, res, 'cl', 400, 'Invalid request.')
                return
            }

            let form = converter.objectFieldsToString(req.body)

            if (form.uid != req.user.id.toString()) {
                _403redirect(req, res, '/user/shop/?show=cl', 'Permission denied.')
                return
            }

            if (!validator.isNotNull(form.cid)) {
                await badRequest(req, res, 'cl', 400, 'No catalog id specified.')
                return
            }

            const ctg = await catalog.read(form.cid, { findBy: 'id' })
            if (! await catalog.isValid(ctg)) {
                await badRequest(req, res, 'cl', 400, 'No valid catalog found for '+form.cid+'.')
                return
            }

            let c_addproducthandler = await shophandler.catalogAddProductHandler(form)
            // TODO: validation check on 'c_addproducthandler' response to show response if deleted or not
            if (debug) console.log('Catalog ' + ctg._id.toString() +' updated.')
            let viewData = await shophandler.populateViewData(req.user.id.toString())
            viewData.user = req.user
            viewData.pane = 'cl'
            viewData.messages = { success: 'Catalog updated.' }
            res.render('sell', viewData)
            return
        } catch (e) {
            console.error(e)
            res.status(500)
            res.render('error', { user: req.user, error: { message: 'Unable to complete requested product addition to catalog.', status: 500 } })
            return
        }
    }
}

let catalogDeleteProductHandler = async (req, res) => {
    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/user/shop/?show=cl', 'You must be signed in.')
        return
    } else {
        try {
            let c = {}
            c.products = []

            let formValidated = false
            let formFields = {}

            if (!req.body) {
                await badRequest(req, res, 'cl', 400, 'Invalid request.')
                return
            }

            let form = converter.objectFieldsToString(req.body)

            if (form.uid != req.user.id.toString()) {
                _403redirect(req, res, '/user/shop/?show=cl', 'Permission denied.')
                return
            }

            if (!validator.isNotNull(form.cid)) {
                await badRequest(req, res, 'cl', 400, 'No catalog id specified.')
                return
            }

            const ctg = await catalog.read(form.cid, { findBy: 'id' })
            if (! await catalog.isValid(ctg)) {
                await badRequest(req, res, 'cl', 400, 'No valid catalog found for ' + form.cid + '.')
                return
            }


            let c_deleteproducthandler = await shophandler.catalogDeleteProductHandler(form)
            // TODO: validation check on 'c_deleteproducthandler' response to show response if deleted or not

            if (debug) console.log('Catalog ' + ctg._id.toString() + ' updated.')
            let viewData = await shophandler.populateViewData(req.user.id.toString())
            viewData.user = req.user
            viewData.pane = 'cl'
            viewData.messages = { success: 'Product removed from catalog.' }
            res.render('sell', viewData)
            return
        } catch (e) {
            console.error(e)
            res.status(500)
            res.render('error', { user: req.user, error: { message: 'Unable to complete requested product addition to catalog.', status: 500 } })
            return
        }
    }
}

// Add shop form handler
let shopAddHandler = async (req, res) => {
    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/user/shop/?show=sf', 'You must be signed in.')
        return
    } else {
        let u = {}

        let formValidated = false
        let formFields = {}

        if (!req.body) {
            await badRequest(req, res, 'sf', 400, 'Invalid request.')
            return
        }

        let form = converter.objectFieldsToString(req.body)

        if (form.uid != req.user.id.toString()) {
            _403redirect(req, res, '/user/shop/?show=sf', 'Permission denied.')
            return
        }

        if (!validator.isNotNull(form.fullname)) {
            await badRequest(req, res, 'sf', 400, 'Shops must have a name.')
            return
        }

        if (req.files && validator.isUploadLimitExceeded(req.files)){
            await badRequest(req, res, 'pd-new', 403, 'Upload limits exceeded.')
            return
        }

        try {
            //let t = await shop.create(u)
            let s_addhandler = await shophandler.shopAddHandler(form,req.files)
            
            if(s_addhandler) {
                let newShop = await shop.read({name: form.fullname, owner: form.uid},{limit: 1})

                if(newShop && await shop.isValid(newShop)) {
                    // Save shop images
                    let sImgs = []
                    if (req.files && Array.isArray(req.files)) {
                        let sImgs = []
                        for (x of req.files) {
                            let img = {}
                            x.storage = cfg.media_datastore ? cfg.media_datastore : 'db'
                            if (x.storage != 'db') {
                                img = await media.write(x, (cfg.media_dest_products ? cfg.media_dest_products : '/shop') + '/' + String(newShop._id) + '/' + (x.originalname ? x.originalname : generator.uuid()))
                            } else {
                                img = x
                            }
                            sImgs.push(img)
                        }
                        newShop.images = sImgs
                    }
                    if (debug) console.log('Saving new shop images')
                    let shopImageSaveResult = await shop.update({ name: String(form.fullname).toLowerCase(), owner: form.uid }, newShop)
                    if (debug) console.error(shopImageSaveResult)
                }
            }

            if (debug) console.log('Shop added for ' + u.owner)
            let viewData = await shophandler.populateViewData(u.owner)
            viewData.user = req.user
            viewData.pane = 'sf'
            viewData.messages = { success: 'Shop added.' }
            res.render('sell', viewData)
            return
        } catch (e) {
            console.error(e)
            res.status(500)
            res.render('error', { user: req.user, error: { message: 'Unable to complete requested addition of a shop.', status: 500 } })
            return
        }
    }
}

// Add shop form handler
let productAddHandler = async (req, res) => {
    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/user/shop/?show=pd-new', 'You must be signed in.')
        return
    } else {
        let p = {}

        let formValidated = false
        let formFields = {}

        if (!req.body) {
            await badRequest(req, res, 'pd-new', 400, 'Invalid request.')
            return
        }

        let form = converter.objectFieldsToString(req.body)

        if (form.uid != req.user.id.toString()) {
            _403redirect(req, res, '/user/shop/?show=pd-new', 'Permission denied.')
            return
        }

        if (req.files && validator.isUploadLimitExceeded(req.files)){
            await badRequest(req, res, 'pd-new', 403, 'Upload limits exceeded.')
            return
        }

        try {
            //let s = await shop.read(p.shop,{findBy: 'id'})
            let s = await shop.read(form.sid,{findBy: 'id'})

            if(!await shop.isValid(s)) {
                badRequest(req, res, 'pd-new', 400, 'Products must be associated with a valid shop.')
                return
            }

            // Returns a promise so reject should trigger the catch block
            let result = await shophandler.productAddHandler(form,req.files)
            console.log(result)
            try {
                let newProd = await product.read({ name: form.fullname.toLowerCase(), shop: form.sid }, { limit: 1 })

                if (result && await product.isValid(newProd)) {

                    // Save product images
                    let pImgs = []
                    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                        for (x of req.files) {
                            let img = {}
                            x.storage = cfg.media_datastore ? cfg.media_datastore : 'db'
                            if (x.storage != 'db') {
                                img = await media.write(x, (cfg.media_dest_products ? cfg.media_dest_products : '/product') + '/' + String(newProd._id) + '/' + (x.originalname ? x.originalname : generator.uuid()))
                            } else {
                                img = x
                            }
                            pImgs.push(img)
                        }
                    }
                    if(debug) console.log('Saving new product images')
                    let productImageSaveResult = await product.update(newProd, {images: pImgs})
                    if(debug) console.error(productImageSaveResult)

                    if (debug) {
                        console.log('Attempting to index new product ' + newProd._id + '.')
                    }

                    let productCurrency = await currency.read(newProd.currency, { findBy: 'id' })

                    let productCurrencyCode = baseCurrencyCode

                    if (productCurrency && currency.isValid(productCurrency) && validator.isNotNull(productCurrency.code)) productCurrencyCode = productCurrency.code

                    let idx_res = await idx.index(productIdx, {
                        ref: newProd._id,
                        name: newProd.name,
                        displayName: newProd.displayName,
                        description: newProd.description,
                        specifications: newProd.specifications,
                        price: newProd.price,
                        currency: productCurrencyCode,
                        status: newProd.status
                    })
                    if (debug) {
                        console.log('Indexer response ' + JSON.stringify(idx_res))
                    }
                } else {
                    console.error(newProd)
                    let e = new Error('Invalid product object')
                    e.name = 'ProductError'
                    e.type = 'Invalid'
                    throw e
                }
            } catch (err) {
                console.log('Error during index update.')
                console.error(err)
                err.stack ? console.error(err.stack) : console.error('No stack trace.')
            }
            let viewData = await shophandler.populateViewData(form.uid.toString())
            viewData.user = req.user
            viewData.pane = 'pd-new'
            viewData.messages = { success: 'Product added.' }
            res.render('sell', viewData)
        } catch (e) {
            console.log('Handling product add error.')
            console.error(e)
            e.stack ? console.error(e.stack) : console.error('No stack trace.')
            try {
                let viewData = await shophandler.populateViewData(form.uid.toString())
                viewData.user = req.user
                viewData.pane = 'pd-new'
                viewData.messages = { error: 'Unable to complete request due to error.' }
                for (const k of Object.keys(form)) {
                    formFields[k] = {class: 'is-valid', value: form[k]}
                    viewData[k] = formFields[k]
                }

                if (e.type == 'InvalidPrice') {
                    console.log('Product pricing error detected.')
                    viewData.messages.error = 'Product unit price is below allowed minimum price of ' + cfg.minimum_price + ' ' + cfg.minimum_price_currency + '.'
                    viewData['unit_dollar'].class = 'is-invalid'
                    viewData['unit_cents'].class = 'is-invalid'
                    res.status(400)
                    res.render('sell', viewData)
                } else if (e.name == 'ProductError') {
                    console.log('Invalid product fields detected.')
                    viewData.messages.error = 'Product could not be registered due to one or more invalid entries. Please check the fields and try again.'
                    if (viewData['fullname']) viewData['fullname'].class = 'is-invalid'
                    if (viewData['description']) viewData['description'].class = 'is-invalid'
                    if (viewData['quantity']) viewData['quantity'].class = 'is-invalid'
                    if (viewData['unit_dollar']) viewData['unit_dollar'].class = 'is-invalid'
                    if (viewData['unit_cents']) viewData['unit_cents'].class = 'is-invalid'
                    res.status(400)
                    res.render('sell', viewData)
                } else {
                    console.log(e.name)
                    throw e
                }
            } catch (err) {
                res.status(500)
                res.render('error', { user: req.user, error: { message: 'Unable to complete operation', status: 500} })
            }
        }
    }
}

// Update shop form handler
let shopUpdateHandler = async (req, res) => {

    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/user/shop/?show=sf', 'You must be signed in.')
        return
    } else {
        if(!req.body) {

        }
        else {
            let formValidated = false
            let formFields = {}
            let form = converter.objectFieldsToString(req.body)
            console.log(form)
            // Read existing shop details
            const s = await shop.read(form.sid, { findBy: 'id' })

            console.log(s)
            switch (form.update) {
                case 'open':
                    if (form.uid != req.user.id.toString()) {
                        _403redirect(req, res, '/user/shop/?show=sf', 'Permission denied.')
                        return
                    }

                    try {
                        let t = await shop.update({ _id: s._id }, { status: 'active' })
                        console.log(t)
                        if (debug) console.log('Shop status made \'active\' for ' + form.uid)
                        let viewData = await shophandler.populateViewData(form.uid.toString())
                        viewData.user = req.user
                        viewData.pane = 'sf'
                        viewData.messages = { success: 'Shop opened.' }
                        res.render('sell', viewData)
                    } catch (e) {
                        console.error(e)
                        res.status(500)
                        res.render('error', { user: req.user, error: { message: 'Unable to complete requested operation.', status: 500} })
                    }
                    break
                case 'close':
                    if (form.uid != req.user.id.toString()) {
                            _403redirect(req, res, '/user/shop/?show=sf', 'Permission denied.')
                            return
                    }

                    try {
                        await shophandler.shopClose(s)
                        let viewData = await shophandler.populateViewData(form.uid.toString())
                        viewData.user = req.user
                        viewData.pane = 'sf'
                        viewData.messages = { success: 'Shop closed.' }
                        res.render('sell', viewData)
                    } catch (e) {
                        console.error(e)
                        res.status(500)
                        res.render('error', { user: req.user, error: { message: 'Unable to complete requested operation.',status: 500 } })
                    }
                    break
                case 'delete':
                    if (form.uid != req.user.id.toString()) {
                        _403redirect(req, res, '/user/shop/?show=sf', 'Permission denied.')
                        return
                    }

                    try {
                        await shophandler.shopDelete(s)
                        let viewData = await shophandler.populateViewData(form.uid.toString())
                        viewData.user = req.user
                        viewData.pane = 'sf'
                        viewData.messages = { success: 'Shop deleted.' }
                        res.render('sell', viewData)
                    } catch (e) {
                        if(e && e.name == 'PermissionError') {
                            console.error(e)
                            let viewData = await shophandler.populateViewData(form.uid.toString())
                            viewData.user = req.user
                            viewData.pane = 'sf'
                            viewData.messages = { error: 'Permission denied. Only closed shops with no active products or catalogs can be deleted.' }
                            res.render('sell', viewData)
                        } else {
                            console.error(e)
                            res.status(500)
                            res.render('error', { user: req.user, error: { message: 'Unable to complete requested operation.', status: 500 } })
                        }
                    }
                    break
                case 'edit':
                    return await badRequest(req, res, 'sf', 501, 'Functionality not implemented', 'info')
                    break
                default:
                    return await badRequest(req, res, 'sf', 400, 'Invalid request.')
                    break
            }

        }
    }
}

// Update product form handler
let productUpdateHandler = async (req, res) => {

    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/user/shop/?show=in', 'You must be signed in.')
        return
    } else {
        if(!req.body) {

        }
        else {
            let formValidated = false
            let formFields = {}
            let form = converter.objectFieldsToString(req.body)

            console.log(form)
            // Read product details
            const p = await product.read(form.pid, { findBy: 'id' })

            console.log(p)

            switch(form.update) {
                case 'delete':
                    if (form.uid != req.user.id.toString()) {
                            _403redirect(req, res, '/user/shop/?show=in', 'Permission denied.')
                            return
                    }

                    try {
                        if(p.status == 'inactive') {
                            let t = await product.delete({ _id: p._id }, p)
                            try {
                                if (debug) {
                                    console.log('Removing product ref ' + p._id + ' from search index')
                                }
                                let idx_res = await idx.deleteMatches(productIdx, {
                                    ref: p._id
                                })
                                if (debug) {
                                    console.log('Indexer response ' + JSON.stringify(idx_res))
                                }
                            } catch (err) {
                                console.log('Error on index update.')
                                console.error(err)
                                err.stack ? console.error(err.stack) : console.error('No stack trace.')
                            }
                            let viewData = await shophandler.populateViewData(form.uid.toString())
                            viewData.user = req.user
                            viewData.pane = 'in'
                            viewData.messages = { success: 'Product deleted.' }
                            res.render('sell', viewData)
                        } else {
                            let viewData = await shophandler.populateViewData(form.uid.toString())
                            viewData.user = req.user
                            viewData.pane = 'in'
                            viewData.messages = { error: 'Permission denied. Only withdrawn products can be deleted.' }
                            res.render('sell', viewData)
                        }
                    } catch (e) {
                        console.error(e)
                        res.status(500)
                        res.render('error', { user: req.user, error: { message: 'Unable to complete requested operation.', status: 500 } })
                    }
                    break
                case 'reactivate':
                    if (form.uid != req.user.id.toString()) {
                        _403redirect(req, res, '/user/shop/?show=in', 'Permission denied.')
                        return
                    }

                    try {
                        let t = await product.update({ _id: p._id }, { status: 'active' })
                        try {
                            if (debug) console.log('Product status made \'active\' for ' + form.pid)
                            let idx_res = await idx.updateMatches(productIdx, {
                                ref: p._id
                            }, {
                                'replacement-values': {
                                    status: 'active'
                                }
                            })
                            if (debug) {
                                console.log('Indexer response ' + JSON.stringify(idx_res))
                            }
                        } catch (err) {
                            console.log('Error on index update.')
                            console.error(err)
                            err.stack ? console.error(err.stack) : console.error('No stack trace.')
                        }
                        let viewData = await shophandler.populateViewData(form.uid.toString())
                        viewData.user = req.user
                        viewData.pane = 'in'
                        viewData.messages = { success: 'Product re-activated.' }
                        res.render('sell', viewData)
                    } catch (e) {
                        console.error(e)
                        res.status(500)
                        res.render('error', { user: req.user, error: { message: 'Unable to complete requested operation.', status: 500 } })
                    }
                    break
                case 'withdraw':
                    if (form.uid != req.user.id.toString()) {
                        _403redirect(req, res, '/user/shop/?show=in', 'Permission denied.')
                        return
                    }

                    try {
                        let t = await product.update({ _id: p._id }, {status: 'inactive'})
                        try {
                            if (debug) console.log('Product status made \'inactive\' for ' + form.pid)
                            let idx_res = await idx.updateMatches(productIdx, {
                                ref: p._id
                            }, {
                                'replacement-values': {
                                    status: 'inactive'
                                }
                            })
                            if (debug) {
                                console.log('Indexer response ' + JSON.stringify(idx_res))
                            }
                        } catch (err) {
                            console.log('Error on index update.')
                            console.error(err)
                            err.stack ? console.error(err.stack) : console.error('No stack trace.')
                        }
                        let viewData = await shophandler.populateViewData(form.uid.toString())
                        viewData.user = req.user
                        viewData.pane = 'in'
                        viewData.messages = { success: 'Product withdrawn.' }
                        res.render('sell', viewData)
                    } catch (e) {
                        console.error(e)
                        res.status(500)
                        res.render('error', { user: req.user, error: { message: 'Unable to complete requested operation.', status: 500 } })
                    }
                    break
                default:
                    return await badRequest(req, res, 'in', 501, 'Functionality not implemented', 'info')
                    break
            }

        }
    }
}

shops.use('/edit', require('./shopeditor'))
shops.use('/edit/*', require('./shopeditor'))
shops.use('/product/edit', require('./producteditor'))
shops.use('/product/edit/*', require('./producteditor'))
shops.use('/catalog/edit', require('./catalogeditor'))
shops.use('/catalog/edit/*', require('./catalogeditor'))
shops.use('/page/:page', async function(req, res, next) {
  try {

      if (validator.hasActiveSession(req)) {
          let page = req.params.page || 1
          let qd = req.query
          let status = 'active'
          console.log(page)
          console.log(qd)
          let panel = 'sf'
          if(qd) {
              switch(qd.show){
                  case 'in':
                  case 'pd':
                  case 'cl':
                  case 'pd-new':
                  case 'or':
                  case 'pkg':
                  case 'py':
                      panel = qd.show
                      break
                  default:
                      panel = 'sf'
              }
          }
          let viewData = {}
          console.log('Page: ' +page)
          viewData = await shophandler.populateViewData(req.user.id.toString(), status = 'active', shop_page = parseInt(page))
          viewData.user = req.user
          viewData.pane = panel
          res.render('sell', viewData)
      } else {
          messages = {error: "You need to be signed in."}
          res.status(403)
          res.render('signin', {messages: messages})
      }
  } catch (e) {
      console.error(e)
      res.status(500)
      res.render('error', { error: { status: 500, message: 'Error retrieving shop pagination data' }, name: '', user: req.user })

  }
})

shops.get('/', async (req, res) => {
    try {
        if (validator.hasActiveSession(req)) {
            let qd = req.query
            let panel = 'sf'
            if(qd) {
                switch(qd.show){
                    case 'in':
                    case 'pd':
                    case 'cl':
                    case 'pd-new':
                    case 'or':
                    case 'pkg':
                    case 'py':
                        panel = qd.show
                        break
                    default:
                        panel = 'sf'
                }
            }
            let viewData = {}
            viewData = await shophandler.populateViewData(req.user.id.toString())
            viewData.user = req.user
            viewData.pane = panel
            res.render('sell', viewData)
        } else {
            messages = {error: "You need to be signed in."}
            res.status(403)
            res.render('signin', {messages: messages})
        }
    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Error retrieving data' }, name: '', user: req.user })

    }
})

shops.post('/', fileUploader, async (req, res)  => {
    try {
        if (validator.hasActiveSession(req)) {
            let form = req.body

            // Check form id and pass off to appropriate form handler. Otherwise if no handler found render account page with unable to process request error message
            switch (form.id) {
                case 'upshop':
                    console.log(form)
                    await shopUpdateHandler(req,res)
                    break
                case 'upproduct':
                    console.log(form)
                    await productUpdateHandler(req,res)
                    break
                case 'np':
                    await productAddHandler(req, res)
                    break
                case 'st':
                    console.log(req.body)
                    await shopAddHandler(req,res)
                    break
                case 'cl':
                    console.log(req.body)
                    await catalogAddHander(req, res)
                    break
                case 'cl-del':
                    console.log(req.body)
                    await catalogDeleteHander(req, res)
                    break
                case 'cl-add-pd':
                    if(debug) console.log(req.body)
                    await catalogAddProductHander(req,res)
                    break
                case 'cl-del-pd':
                    if (debug) console.log(req.body)
                    await catalogDeleteProductHandler(req, res)
                    break
                default:
                   console.log(req)
                   await badRequest(req, res)
            }
        } else {
        _403redirect(req,res,'/user/shop','You need to be signed in.')
        }
    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Shop update error' }, name: '', user: req.user })
    }
})

module.exports = shops

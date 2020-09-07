const cfg = require('../../configuration')
const validator = require('../../utilities/validator')
const user = require('../../models/user')
const shop = require('../../models/shop')
const product = require('../../models/product')
const bcrypt = require('bcryptjs')
const express = require('express')
const converter = require('../../utilities/converter')
const generator = require('../../utilities/generator')
const media = require('../../adapters/storage/media')
const debug = cfg.env == 'development' ? true : false
//const passport = require('passport')
const multer  = require('multer')
const storage = multer.memoryStorage()
const fileUploader = multer({storage: storage,
                    onError : function(err, next) {
                      console.log('error', err);
                      next(err);
                    }
                  }).array('fullimage', 10)
//const upload = multer({ dest: 'uploads/' })
const btoa = require('btoa')
const catalog = require('../../models/catalog')

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
        let viewData = await populateViewData(req.user.id.toString())
        viewData.user = req.user
        viewData.pane = typeof(show) == 'string' && show !== "" ? show : 'sf'
        viewData.messages = mObj
        res.render('sell', viewData)
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

let populateViewData = async (uid, status = 'active') => {
    return new Promise(async (resolve, reject) => {
        t = { owner: uid }
        console.log('Populating view for shop owner: ' + t.owner)
        try {

            s = await shop.read(t)
            let viewData = {}

            viewData.shops = []
            if (s) {
                if (Array.isArray(s)) {
                    for (const x of s) {
                        if (Array.isArray(x.images) && x.images.length > 0) {
                            for (const xx of x.images) {
                                xx.src = media.getBinaryDetails(xx)
                            }
                        }
                        let p = await product.read({ shop: x._id.toString() })
                        for (const y of p) {
                            if (Array.isArray(y.images) && y.images.length > 0) {
                                for (const yy of y.images) {
                                  yy.src = media.getBinaryDetails(yy)
                                }
                            }
                        }
                        x.products = p
                    }
                    viewData.shops = s
                } else if(await shop.isValid(s)) {
                    if (Array.isArray(s.images) && s.images.length > 0) {
                        for (const sxx of s.images) {
                            sxx.src = media.getBinaryDetails(sxx)
                        }
                    }
                    let sp = await product.read({ shop: s._id.toString() })
                    for (const sy of sp) {
                        if (Array.isArray(sy.images) && sy.images.length > 0) {
                            for (const syy of sy.images) {
                                syy.src = media.getBinaryDetails(syy)
                            }
                        }
                    }
                    s.products = sp

                    viewData.shops = [s]
                }
            }

            viewData.catalogs = []
            for (let i = 0; i < viewData.shops.length; i++) {
                try {
                    if (await shop.isValid(viewData.shops[i])) {
                        let cFilter = { owner: viewData.shops[i]._id.toString() }
                        if(debug) {
                            console.log('Searching for catalogs using filter:')
                            console.log(cFilter)
                        }
                        let cList = await catalog.read(cFilter)
                        if (Array.isArray(cList) && cList.length > 0) {
                            if(debug) {
                                console.log('Catalog list found: ')
                                console.log(cList)
                            }
                            for (let j = 0; j < cList.length; j++) {
                                if (await catalog.isValid(cList[j])) {
                                    if(debug) console.log('Adding 1 item to catalog list')
                                    viewData.catalogs.push(cList[j])
                                } 
                            }
                        } else if (await catalog.isValid(cList)) {
                            if (debug) {
                                console.log('Single catalog found: ')
                                console.log(cList)
                            }
                            viewData.catalogs.push(cList)
                        }
                    }
                } catch (e) {
                    console.error(e)
                    console.log('Error reading shop list skipping remainder.')
                }
            }
            if(debug) {
                console.log('View Data: ')
                console.log(viewData)
            }
            resolve(viewData)
        } catch (e) {
            reject(e)
        }
    })
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

            if (! await shop.isValid(shp) && shp.status == 'active') {
                await badRequest(req, res, 'cl', 400, 'Catalogs must be associated with a valid and active storefront.')
                return
            }

            c.name = form.name
            c.description = form.description
            c.owner = form.sid
            c.products = []

            let ctg = await catalog.create(c)
            if (debug) console.log('Catalog added for ' + shp.displayName)
            //let viewData = await populateViewData('\''+u.uid+'\'')
            let viewData = await populateViewData(req.user.id.toString())
            viewData.user = req.user
            viewData.pane = 'cl'
            viewData.messages = { success: 'Catalog created.' }
            res.render('sell', viewData)
            return
        } catch (e) {
            console.error(e)
            res.status(500)
            res.render('error', { user: req.user, messages: { error: 'Unable to complete requested addition of a catalog.' } })
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

        // Read existing stored user details
        const usr = await user.read(form.uid, { findBy: 'id' })

        u.owner = form.uid
        u.name = form.fullname
        u.displayName = form.fullname
        u.status = 'active'
        //if (typeof(req.file) !== 'undefined'){
        if (req.files){
            if (validator.isUploadLimitExceeded(req.files)) {
                await badRequest(req, res, 'pd-new', 403, 'Upload limits exceeded.')
                return
            }

            for (x of req.files){
              x.storage = 'db'
            }
            console.log(req.files)
            u.images = req.files
        }

        let addr = {}
        addr.type = form.addressType
        addr.streetAddress = form.addressStreet
        addr.locality = form.addressLocality
        addr.region = form.addressRegion
        addr.postalCode = form.addressPostcode
        addr.country = form.addressCountry
        addr.formatted = generator.formattedAddress(addr)

        if (form.setPrimary != 'true'){
            u.addresses = usr.addresses
            u.addresses.push(addr)
        } else {
            addr.primary = true
            if (typeof(usr.addresses) !== 'undefined') {
                u.addresses = generator.removePrimaryFields(usr.addresses)
                u.addresses.push(addr)
            } else {
                u.addresses = [addr]
            }
        }

        try {
            let t = await shop.create(u)
            if (debug) console.log('Shop added for ' + u.owner)
            let viewData = await populateViewData(u.owner)
            viewData.user = req.user
            viewData.pane = 'sf'
            viewData.messages = { success: 'Shop added.' }
            res.render('sell', viewData)
            return
        } catch (e) {
            console.error(e)
            res.status(500)
            res.render('error', { user: req.user, messages: { error: 'Unable to complete requested addition of a shop.' } })
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

        p.shop = form.sid
        p.name = form.fullname
        p.description = form.description
        p.status = 'active'
        p.quantity = form.quantity ? Number(form.quantity) : 0
        p.price = generator.roundNumber( form.unit_dollar && form.unit_cents ? Number(form.unit_dollar + '.' + form.unit_cents): 0, 2)
        if (form.name !== 'undefined'){
          p.displayName = form.name

        }
        //if (req.file) {console.log('File exists')} else {console.log('file doesnt exist')}
        //if (req.file !== 'undefined'){
        if (req.files){

            if(validator.isUploadLimitExceeded(req.files)) {
                await badRequest(req, res, 'pd-new', 403, 'Upload limits exceeded.')
                return
            }

            for (x of req.files){
              x.storage = 'db'
            }
            p.images = req.files
        }
        let specs = {}
        for (key in form){
          if (!key.startsWith('spec_')) continue
          specs[key.replace('spec_', '')] = form[key]
          //specs[key] = form[key]
          //p[key] = form[key]
          //console.log(key, form[key])
          //console.log(key.replace('spec_', ''), form[key])
        }
        p.specifications = specs
        try {
            let t = await product.create(p)
            if (debug) {
                console.log('Added product: ')
                console.log(p)
                console.log('Product added for Shop:' + p.shop)
            }
            let viewData = await populateViewData(form.uid.toString(),p.shop.toString())
            viewData.user = req.user
            //viewData.pane = 'in'
            viewData.pane = 'pd-new'
            viewData.messages = { success: 'Product added.' }
            res.render('sell', viewData)
        } catch (e) {
            console.error(e)
            res.status(500)
            res.render('error', { user: req.user, messages: { error: 'Unable to complete requested addition of a product.' } })
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
                        let viewData = await populateViewData(form.uid.toString())
                        viewData.user = req.user
                        viewData.pane = 'sf'
                        viewData.messages = { success: 'Shop opened.' }
                        res.render('sell', viewData)
                    } catch (e) {
                        console.error(e)
                        res.status(500)
                        res.render('error', { user: req.user, messages: { error: 'Unable to complete requested operation.' } })
                    }
                    break
                case 'close':
                    if (form.uid != req.user.id.toString()) {
                            _403redirect(req, res, '/user/shop/?show=sf', 'Permission denied.')
                            return
                    }

                    try {
                        let t = await shop.update({_id: s._id}, {status: 'inactive'})
                        console.log(t)
                        if (debug) console.log('Shop status made \'inactive\' for ' + form.uid)
                        let viewData = await populateViewData(form.uid.toString())
                        viewData.user = req.user
                        viewData.pane = 'sf'
                        viewData.messages = { success: 'Shop closed.' }
                        res.render('sell', viewData)
                    } catch (e) {
                        console.error(e)
                        res.status(500)
                        res.render('error', { user: req.user, messages: { error: 'Unable to complete requested operation.' } })
                    }
                    break
                case 'delete':
                    if (form.uid != req.user.id.toString()) {
                        _403redirect(req, res, '/user/shop/?show=sf', 'Permission denied.')
                        return
                    }

                    try {
                        if(s.status == 'inactive'){
                            let t = await shop.delete({ _id: s._id })
                            console.log(t)
                            if (debug) console.log('Shop deleted for ' + form.uid)
                            let viewData = await populateViewData(form.uid.toString())
                            viewData.user = req.user
                            viewData.pane = 'sf'
                            viewData.messages = { success: 'Shop deleted.' }
                            res.render('sell', viewData)
                        } else {
                            let viewData = await populateViewData(form.uid.toString())
                            viewData.user = req.user
                            viewData.pane = 'sf'
                            viewData.messages = { error: 'Permission denied. Only closed shops can be deleted.' }
                            res.render('sell', viewData)
                        }
                    } catch (e) {
                        console.error(e)
                        res.status(500)
                        res.render('error', { user: req.user, messages: { error: 'Unable to complete requested operation.' } })
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
                            let t = await product.delete({_id: p._id}, p)
                            console.log(t)
                            let viewData = await populateViewData(form.uid.toString())
                            viewData.user = req.user
                            viewData.pane = 'in'
                            viewData.messages = { success: 'Product deleted.' }
                            res.render('sell', viewData)
                        } else {
                            let viewData = await populateViewData(form.uid.toString())
                            viewData.user = req.user
                            viewData.pane = 'in'
                            viewData.messages = { error: 'Permission denied. Only withdrawn products can be deleted.' }
                            res.render('sell', viewData)
                        }
                    } catch (e) {
                        console.error(e)
                        res.status(500)
                        res.render('error', { user: req.user, messages: { error: 'Unable to complete requested operation.' } })
                    }
                    break
                case 'reactivate':
                    if (form.uid != req.user.id.toString()) {
                        _403redirect(req, res, '/user/shop/?show=in', 'Permission denied.')
                        return
                    }

                    try {
                        let t = await product.update({ _id: p._id }, { status: 'active' })
                        console.log(t)
                        if (debug) console.log('Product status made \'active\' for ' + form.pid)
                        let viewData = await populateViewData(form.uid.toString())
                        viewData.user = req.user
                        viewData.pane = 'in'
                        viewData.messages = { success: 'Product re-activated.' }
                        res.render('sell', viewData)
                    } catch (e) {
                        console.error(e)
                        res.status(500)
                        res.render('error', { user: req.user, messages: { error: 'Unable to complete requested operation.' } })
                    }
                    break
                case 'withdraw':
                    if (form.uid != req.user.id.toString()) {
                        _403redirect(req, res, '/user/shop/?show=in', 'Permission denied.')
                        return
                    }

                    try {
                        let t = await product.update({ _id: p._id }, {status: 'inactive'})
                        console.log(t)
                        if (debug) console.log('Product status made \'inactive\' for ' + form.pid)
                        let viewData = await populateViewData(form.uid.toString())
                        viewData.user = req.user
                        viewData.pane = 'in'
                        viewData.messages = { success: 'Product withdrawn.' }
                        res.render('sell', viewData)
                    } catch (e) {
                        console.error(e)
                        res.status(500)
                        res.render('error', { user: req.user, messages: { error: 'Unable to complete requested operation.' } })
                    }
                    break
                case 'edit':
                    console.log('Not routing to Product Edit.')
                    return await badRequest(req, res, 'in', 501, 'Functionality not implemented', 'info')
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
            viewData = await populateViewData(req.user.id.toString())
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

shops.post('/', function (req, res) {
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
    //console.log(req.body)
    //console.log(req.files)
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
                    //res.status(500)
                    //res.render('error', { error: { status: 500, message: 'Testing' }, name: '', user: req.user })
                    break
                case 'st':
                    console.log(req.body)
                    await shopAddHandler(req,res)
                    break
                case 'cl':
                    console.log(req.body)
                    await catalogAddHander(req, res)
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
  }
  })
})

module.exports = shops

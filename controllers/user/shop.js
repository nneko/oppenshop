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
var upload = multer({storage: storage})
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
    mObj[mtype] = msg ? msg : 'Invalid account update request.'

    try {
        if (req.user) {
            let viewData = await populateViewData(req.user.id)
            viewData.user = req.user
            viewData.pane = show
            viewData.messages = mObj
            res.render('sell', viewData)
        } else {
            res.render('sell', { user: undefined, pane: show, messages: mObj })
        }

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
        console.log(t)
        try {

            s = await shop.read(t)
            let viewData = {}

            viewData.shops = []
            if (s) {
                if (Array.isArray(s)) {
                    for (x of s) {
                        if (typeof (x.image) !== 'undefined') {
                            x.image.src = media.getBinaryDetails(x.image)
                        }
                        let p = await product.read({ shop: x._id.toString() })
                        for (y of p) {
                            if (typeof (y.image) !== 'undefined') {
                                y.image.src = media.getBinaryDetails(y.image)
                            }
                        }
                        x.products = p
                    }
                    viewData.shops = s
                }
            }

            viewData.catalogs = []
            for (let i = 0; i < viewData.shops.length; i++) {
                try {
                    if (shop.isValid(viewData.shops[i])) {
                        let cList = await catalog.read({ shop: viewData.shops[i]._id })
                        if (Array.isArray(cList) && cList.length > 0) {
                            for (let j = 0; j < cList.length; j++) {
                                if (catalog.isValid(cList[j])) viewData.catalogs.push(c)
                            }
                        }
                    }
                } catch (e) {
                    console.error(e)
                    console.log('Error reading shop list skipping remainder.')
                }
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

            if (form.uid != req.user.id) {
                _403redirect(req, res, '/user/shop/?show=cl', 'Permission denied.')
                return
            }

            if (!validator.isNotNull(form.name)) {
                await badRequest(req, res, 'cl', 400, 'Catalogs must have a name.')
                return
            }

            const shp = await shop.read(form.shop, {findBy: 'id'})

            if (!shop.isValid(shp) && shp.status == 'active') {
                await badRequest(req, res, 'cl', 400, 'Catalogs must be associated with a valid and active storefront.')
                return
            }

            c.name = form.name
            c.description = form.description
            c.shop = form.shop
            c.products = []

            let ctg = await catalog.create(c)
            if (debug) console.log('Catalog added for ' + shp.displayName)
            //let viewData = await populateViewData('\''+u.uid+'\'')
            let viewData = await populateViewData(req.user.id)
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

        if (form.uid != req.user.id) {
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
        if (typeof(req.file) !== 'undefined'){
            //var binary = ''
            //var bytes = [].slice.call(new Uint8Array(req.file.buffer))
            //bytes.forEach((b) => binary += String.fromCharCode(b))
            //req.file.binary = 'data:'+req.file.mimetype+';base64'+binary
            //req.file.base64 = btoa([].reduce.call(new Uint8Array(req.file.buffer),function(p,c){return p+String.fromCharCode(c)},''))
            //console.log(req.file.base64)
            req.file.storage = 'db'
            //console.log(req.file)
            u.image = req.file
        }
        if (form.setPrimary != 'true'){
            // TODO: add new address for Shop
            let add = {}
            add.type = form.addressType
            add.street = form.street
            add.state = form.state
            add.postcode = form.postcode
            add.country = form.country
            u.address = add
            //if (debug) console.log('New to add Address fields for new Shop ' + form)

        } else {
            if (typeof(usr.addresses) !== 'undefined') {
                u.address = getPrimaryField(usr.addresses)
            } else {
                res.render('error', { user: req.user, messages: { error: 'Unable to complete requested addition of a shop, due to no address assigned to user.' } })
            }
        }

        try {
            //await user.update({ preferredUsername: u.preferredUsername }, u)
            //console.log(usr)
            //console.log(u)
            let t = await shop.create(u)
            //console.log(t.ops)
            if (debug) console.log('Shop added for ' + u.owner)
            //let viewData = await populateViewData('\''+u.uid+'\'')
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

        if (form.uid != req.user.id) {
            _403redirect(req, res, '/user/shop/?show=pd-new', 'Permission denied.')
            return
        }

        //u.uid = form.uid
        p.shop = form.sid
        p.name = form.fullname
        p.description = form.description
        p.status = 'active'
        p.quantity = 0
        if (form.name !== 'undefined'){
          p.displayName = form.name

        }
        if (req.file !== 'undefined'){
            req.file.storage = 'db'
            console.log(req.file)
            p.image = req.file
        }
        try {
            let t = await product.create(p)
            if (debug) {
                console.log('Added product: ')
                console.log(p)
                console.log('Product added for Shop:' + p.shop)
            }
            let viewData = await populateViewData(form.uid.toString(),p.shop.toString())
            viewData.user = req.user
            viewData.pane = 'in'
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
            let u = {}

            let formValidated = false
            let formFields = {}
            let form = converter.objectFieldsToString(req.body)
            console.log(form)
            switch(form.update) {
                case 'delete':
                    if (form.uid != req.user.id) {
                            _403redirect(req, res, '/user/shop/?show=em', 'Permission denied.')
                            return
                    }
                    console.log(form)
                    // Read existing stored user details
                    const s = await shop.read(form.sid, { findBy: 'id' })
                    s.status = 'inactive'

                    console.log(s)

                    try {
                        let t = await shop.update({_id: s._id}, s)
                        console.log(t)
                        if (debug) console.log('Shop status made \'inactive\' for ' + form.uid)
                        let viewData = await populateViewData(form.uid.toString())
                        viewData.user = req.user
                        viewData.pane = 'sf'
                        viewData.messages = { success: 'Shop removed and made inactive.' }
                        res.render('sell', viewData)
                    } catch (e) {
                        console.error(e)
                        res.status(500)
                        res.render('error', { user: req.user, messages: { error: 'Unable to complete requested operation.' } })
                    }

                    break
                case 'edit':
                    return await badRequest(req, res, 'ls', 501, 'Functionality not implemented', 'info')
                    break
                default:
                    return await badRequest(req, res, 'ls', 400, 'Invalid address.')
                    break
            }

        }
    }
}

// Update product form handler
let productUpdateHandler = async (req, res) => {

    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/user/shop/?show=sf', 'You must be signed in.')
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
                    if (form.uid != req.user.id) {
                            _403redirect(req, res, '/user/shop/?show=em', 'Permission denied.')
                            return
                    }
                    console.log(form)
                    // Read existing stored user details
                    const p = await product.read(form.pid, { findBy: 'id' })
                    //const s = await shop.read(form.sid, { findBy: 'id' })
                    p.status = 'inactive'

                    console.log(p)

                    try {
                        let t = await product.update({_id: p._id}, p)
                        console.log(t)
                        if (debug) console.log('Product status made \'inactive\' for ' + form.pid)
                        let viewData = await populateViewData(form.uid.toString())
                        viewData.user = req.user
                        viewData.pane = 'in'
                        viewData.messages = { success: 'Product removed and made inactive.' }
                        res.render('sell', viewData)
                    } catch (e) {
                        console.error(e)
                        res.status(500)
                        res.render('error', { user: req.user, messages: { error: 'Unable to complete requested operation.' } })
                    }

                    break
                case 'edit':
                    return await badRequest(req, res, 'ls', 501, 'Functionality not implemented', 'info')
                    break
                default:
                    return await badRequest(req, res, 'ls', 400, 'Invalid address.')
                    break
            }

        }
    }
}


shops.get('/', async (req, res) => {
    try {
        if (validator.hasActiveSession(req)) {
            let qd = req.query.data
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
        res.render('error', { error: { status: 500, message: 'Error retrieving account data' }, name: '', user: req.user })

    }
})

shops.post('/', upload.single('fullimage'),
    async (req, res) => {
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
                    console.log(req.body)
                    console.log(req.file)
                    await productAddHandler(req, res)
                    break
                case 'st':
                    console.log(req.body)
                    await shopAddHandler(req,res)
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

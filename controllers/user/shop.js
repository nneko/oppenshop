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
            let viewData = await populateUserShopViewData(req.user.id)
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
            //let viewData = await populateUserShopViewData('\''+u.uid+'\'')
            let viewData = await populateUserShopViewData(req.user.id)
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
        _403redirect(req, res, '/user/shop/?show=ls', 'You must be signed in.')
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
            //if (debug) console.log('New to add Address fields for new Shop ' + u.uid)
        } else {
            if (typeof(usr.addresses) !== 'undefined') {
               //u.address = getPrimaryField(usr.addresses)
            } else {
                res.render('error', { user: req.user, messages: { error: 'Unable to complete requested addition of a shop, due to no address assigned to user.' } })
            }
        }

        try {
            //await user.update({ preferredUsername: u.preferredUsername }, u)
            console.log(usr)
            console.log(u)
            let t = await shop.create(u)
            console.log(t.ops)
            if (debug) console.log('Shop added for ' + u.owner)
            //let viewData = await populateUserShopViewData('\''+u.uid+'\'')
            let viewData = await populateUserShopViewData(u.owner)
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
        _403redirect(req, res, '/user/shop/?show=pd', 'You must be signed in.')
        return
    } else {
        let u = {}

        let formValidated = false
        let formFields = {}

        if (!req.body) {
            await badRequest(req, res, 'pd', 400, 'Invalid request.')
            return
        }

        let form = converter.objectFieldsToString(req.body)

        if (form.uid != req.user.id) {
            _403redirect(req, res, '/user/shop/?show=pd', 'Permission denied.')
            return
        }
        // Read existing stored user details
        const usr = await user.read(form.uid, { findBy: 'id' })

        //u.uid = form.uid
        u.shop = form.sid
        u.name = form.fullname
        u.description = form.description
        u.status = 'active'
        if (form.name !== 'undefined'){
          u.displayName = form.name

        }
        if (req.file !== 'undefined'){
            //var binary = ''
            //var bytes = [].slice.call(new Uint8Array(req.file.buffer))
            //bytes.forEach((b) => binary += String.fromCharCode(b))
            //req.file.binary = 'data:'+req.file.mimetype+';base64'+binary
            //req.file.base64 = btoa([].reduce.call(new Uint8Array(req.file.buffer),function(p,c){return p+String.fromCharCode(c)},''))
            //console.log(req.file.base64)
            req.file.storage = 'db'
            console.log(req.file)
            u.image = req.file
        }
        /*
        if (form.setPrimary != 'true'){
            // TODO: add new address for Shop
            //if (debug) console.log('New to add Address fields for new Shop ' + u.uid)
        } else {
            if (usr.addresses !== 'undefined') {
               //u.address = getPrimaryField(usr.addresses)
            } else {
                res.render('error', { user: req.user, messages: { error: 'Unable to complete requested addition of a shop, due to no address assigned to user.' } })
            }
        }
        */
        try {
            //await user.update({ preferredUsername: u.preferredUsername }, u)
            console.log(usr)
            console.log(u)
            let t = await product.create(u)
            console.log(t.ops)
            if (debug) console.log('Product added for Shop:'+ u.shop)
            //let viewData = await populateUserShopViewData('\''+u.uid+'\'')
            let viewData = await populateUserProductViewData(form.uid.toString(),u.shop.toString())
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


let populateUserShopViewData = async (uid,status = 'active') => {
    return new Promise(async (resolve, reject) => {
        let u = {}
        //t = {uid: uid, status: status}
        //t = {owner: uid, status: status}
        t = {owner: uid}
        console.log(t)
        try {
            //u = await shop.read(uid, { findBy: 'uid' })
            //s = await shop.read({owner: t.uid})

            s = await shop.read(t)
            //console.log(s)
            u = await user.read(uid, {findBy: 'id'})
            //console.log(u)
            let viewData = {}

            viewData.shops = []
            if(s) {
                if(Array.isArray(s)) {
                    for (x of s) {
                      //console.log(x)
                      //console.log(typeof(x.image))
                      if (typeof(x.image) !== 'undefined'){
                        //console.log(x.image.mimetype)
                        //console.log(media.getBinaryDetails(x.image))
                        x.image.src = media.getBinaryDetails(x.image)
                        //console.log(x.image.src)
                      }
                      //let p = await product.read({shop: x._id.toString(), status: status})
                      let p = await product.read({shop: x._id.toString()})
                      //console.log(p)
                      for (y of p){
                        if (typeof(y.image) !== 'undefined'){
                          y.image.src = media.getBinaryDetails(y.image)
                        }
                      }
                      x.products = p
                    }
                    viewData.shops = s
                    // For handling an array of files
                    // s.file.map(x.src => media.getBinaryDetails(x))
                    //viewData.shops = s
                } /*
                else {
                    if (shop.isValid(s)){
                        viewData.shops.push(s)
                    }
                } */
            }

            viewData.catalogs = []
            for (let i=0;i<viewData.shops.length;i++) {
                try {
                    if(shop.isValid(viewData.shops[i])) {
                        let cList = await catalog.read({shop: viewData.shops[i]._id})
                        if(Array.isArray(cList) && cList.length > 0) {
                            for(let j=0;j<cList.length;j++) {
                                if(catalog.isValid(cList[j])) viewData.catalogs.push(c)
                            }
                        }
                    }
                } catch (e) {
                    console.error(e)
                    console.log('Error reading shop list skipping remainder.')
                }
            }
            console.log(viewData.catalogs)

            viewData.addresses = u.addresses
            let primaryAddr = generator.getPrimaryField(viewData.addresses)
            if (primaryAddr) {
                viewData.addressStreet = { value: primaryAddr.streetAddress }
                viewData.addressLocality = { value: primaryAddr.locality }
                viewData.addressRegion = { value: primaryAddr.region }
                viewData.addressPostcode = { value: primaryAddr.postalCode }
                viewData.addressCountry = { value: primaryAddr.country }
                viewData.addressType = { value: primaryAddr.type }
            }
            viewData.emails = u.emails
            viewData.phoneNumbers = u.phoneNumbers
            let phone = generator.getPrimaryField(viewData.phoneNumbers)
            if (phone) {
                viewData.phone ={
                    value: phone.value,
                    type: phone.type
                }
            }
            resolve(viewData)
        } catch (e) {
            reject(e)
        }
    })
}

let populateUserProductViewData = async (uid,sid,status = 'active') => {
    return new Promise(async (resolve, reject) => {
        let u = {}
        //t = {uid: uid, status: status}
        //t = {owner: uid, status: status}
        t = {_id: sid}
        console.log(t)
        try {
            //u = await shop.read(uid, { findBy: 'uid' })
            //s = await shop.read({owner: t.uid})
            let p = {}
            s = await shop.read(t)
            console.log(s)

            u = await user.read(uid, {findBy: 'id'})
            //console.log(u)
            let viewData = {}

            viewData.shops = []
            if(s) {
                if(Array.isArray(s)) {
                    for (x of s) {
                      //console.log(x)
                      //p.append(await product.read({shop: x._id.toString(), status: status}))
                      p.append(await product.read({shop: x._id.toString()}))
                      //console.log(p)


                    }
                    s.all_products = p
                    viewData.shops = s
                    // For handling an array of files
                    // s.file.map(x.src => media.getBinaryDetails(x))
                    //viewData.shops = s
                } /*
                else {
                    if (shop.isValid(s)){
                        viewData.shops.push(s)
                    }
                } */
            }

            viewData.addresses = u.addresses
            /*
            let primaryAddr = getPrimaryField(viewData.addresses)
            if (primaryAddr) {
                viewData.addressStreet = { value: primaryAddr.streetAddress }
                viewData.addressLocality = { value: primaryAddr.locality }
                viewData.addressRegion = { value: primaryAddr.region }
                viewData.addressPostcode = { value: primaryAddr.postalCode }
                viewData.addressCountry = { value: primaryAddr.country }
                viewData.addressType = { value: primaryAddr.type }
            }
            */
            viewData.emails = u.emails
            viewData.phoneNumbers = u.phoneNumbers
            /*
            let phone = getPrimaryField(viewData.phoneNumbers)
            if (phone) {
                viewData.phone ={
                    value: phone.value,
                    type: phone.type
                }
            }
            */
            //viewData.verifiedUser = u.verified
            /*
            let dForms = {
                security: false,
                contact: false,
                addresses: false,
                orders: false,
                payments: false,
                settings: false
            }

            // Disable security credentials update for external accounts
            if (!validator.isLocalUserAccount(u)) {
                dForms.security = true
            }
            viewData.disabledForms = dForms
            */
            resolve(viewData)
        } catch (e) {
            reject(e)
        }
    })
}

let populateUserViewData = async (uid) => {
    return new Promise(async (resolve, reject) => {
        try {
            let u = await user.read(uid, { findBy: 'id' })
            let viewData = {}
            viewData.addresses = u.addresses
            let primaryAddr = generator.getPrimaryField(viewData.addresses)
            if (primaryAddr) {
                viewData.addressStreet = { value: primaryAddr.streetAddress }
                viewData.addressLocality = { value: primaryAddr.locality }
                viewData.addressRegion = { value: primaryAddr.region }
                viewData.addressPostcode = { value: primaryAddr.postalCode }
                viewData.addressCountry = { value: primaryAddr.country }
                viewData.addressType = { value: primaryAddr.type }
            }
            viewData.emails = u.emails
            viewData.phoneNumbers = u.phoneNumbers
            let phone = generator.getPrimaryField(viewData.phoneNumbers)
            if (phone) {
                viewData.phone ={
                    value: phone.value,
                    type: phone.type
                }
            }
            resolve(viewData)
        } catch (e) {
            reject(e)
        }
    })
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
                        let viewData = await populateUserShopViewData(form.uid.toString())
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
                        let viewData = await populateUserShopViewData(form.uid.toString())
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
                //console.log(qd)

                switch(qd.show){
                    case 'in':
                      //console.log('Shop Inventory - All Products:')
                      //console.log(qd.show)
                      panel = qd.show
                      break
                    case 'pd':
                    case 'cl':
                    case 'pd-all':
                    case 'pd-new':
                    case 'pd-arc':
                    case 'or':
                    case 'pkg':
                    case 'py':
                        panel = qd.show
                        break
                    default:
                        panel = 'sf'
                }
            }
            //console.log('Shop Get:')
            let viewData = {}
            /*
            if (req.query.id !== 'undefined'){
               if (req.query.id == 'upshop'){
                  if (req.query.update == 'archived'){
                      viewData = await populateUserShopViewData(req.user.id.toString() ,'inactive')
                      viewData.archived = 'true'
                      panel = req.query.panel
                  } else {
                      viewData = await populateUserShopViewData(req.user.id.toString())
                      panel = req.query.panel
                  }
                } else {
                  viewData = await populateUserShopViewData(req.user.id.toString())
                }
            } else {
                viewData = await populateUserShopViewData(req.user.id.toString())
            } */
            viewData = await populateUserShopViewData(req.user.id.toString())
            //console.log(viewData)
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
    /*function (err, req, res, next) {
    if (err) {
        console.log(req)
        console.log(req.file)
        console.error(err)
        return res.sendStatus(500)
    }
    console.log(req.file)
    next()
    }, */
    async (req, res) => {
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
                case 'upshop':
                    //await addressUpdateHandler(req, res)
                    console.log(form)
                    await shopUpdateHandler(req,res)
                    break
                case 'upproduct':
                    //await addressUpdateHandler(req, res)
                    console.log(form)
                    await productUpdateHandler(req,res)
                    break
                case 'np':
                    console.log(req.body)
                    console.log(req.file)
                    await productAddHandler(req, res)
                    //res.status(500)
                    //res.render('error', { user: req.user, messages: { error: 'Testing.' } })
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
                case 'st':
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

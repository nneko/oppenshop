const cfg = require('../../configuration')
const validator = require('../../utilities/validator')
const user = require('../../models/user')
const shop = require('../../models/shop')
const product = require('../../models/product')
const bcrypt = require('bcryptjs')
const express = require('express')
const converter = require('../../utilities/converter')
const generator = require('../../utilities/generator')
const debug = cfg.env == 'development' ? true : false
//const passport = require('passport')
const multer  = require('multer')
const storage = multer.memoryStorage()
var upload = multer({storage: storage})
//const upload = multer({ dest: 'uploads/' })
const btoa = require('btoa')

let shops = express.Router()

let props = {
    title: cfg.title,
    theme: cfg.template
}

// Add shop form handler
let shopAddHandler = async (req, res) => {
    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/sell/?show=ls', 'You must be signed in.')
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

        if (form.uid != req.user.id) {
            _403redirect(req, res, '/sell/?show=em', 'Permission denied.')
            return
        }
        // Read existing stored user details
        const usr = await user.read(form.uid, { findBy: 'id' })

        u.owner = form.uid
        u.name = form.fullname
        u.displayName = form.fullname
        u.status = 'active'
        if (req.file !== 'undefined'){
            var binary = ''
            var bytes = [].slice.call(new Uint8Array(req.file.buffer))
            bytes.forEach((b) => binary += String.fromCharCode(b))
            //req.file.binary = 'data:'+req.file.mimetype+';base64'+binary
            req.file.base64 = btoa([].reduce.call(new Uint8Array(req.file.buffer),function(p,c){return p+String.fromCharCode(c)},''))
            //console.log(req.file.base64)
            console.log(req.file)
            u.image = req.file
        }
        if (form.setPrimary != 'true'){
            // TODO: add new address for Shop
            //if (debug) console.log('New to add Address fields for new Shop ' + u.uid)
        } else {
            if (usr.addresses !== 'undefined') {
               //u.address = getPrimaryField(usr.addresses)
            } else {
                res.render('error', { title: props.title, user: req.user, messages: { error: 'Unable to complete requested addition of a shop, due to no address assigned to user.' } })
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
            viewData.pane = 'ls'
            viewData.messages = { success: 'Shop added.' }
            res.render('user/shop', viewData)
        } catch (e) {
            console.error(e)
            res.status(500)
            res.render('error', { title: props.title, user: req.user, messages: { error: 'Unable to complete requested addition of a shop.' } })
        }
    }
}

// Add shop form handler
let productAddHandler = async (req, res) => {
    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/sell/?show=ls', 'You must be signed in.')
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

        if (form.uid != req.user.id) {
            _403redirect(req, res, '/sell/?show=em', 'Permission denied.')
            return
        }
        // Read existing stored user details
        const usr = await user.read(form.uid, { findBy: 'id' })

        u.uid = form.uid
        u.name = form.fullname
        u.displayName = form.name
        u.desc = form.description
        u.status = 'active'
        if (req.file !== 'undefined'){
            var binary = ''
            var bytes = [].slice.call(new Uint8Array(req.file.buffer))
            bytes.forEach((b) => binary += String.fromCharCode(b))
            //req.file.binary = 'data:'+req.file.mimetype+';base64'+binary
            req.file.base64 = btoa([].reduce.call(new Uint8Array(req.file.buffer),function(p,c){return p+String.fromCharCode(c)},''))
            //console.log(req.file.base64)
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
                res.render('error', { title: props.title, user: req.user, messages: { error: 'Unable to complete requested addition of a shop, due to no address assigned to user.' } })
            }
        }
        */
        try {
            //await user.update({ preferredUsername: u.preferredUsername }, u)
            console.log(usr)
            console.log(u)
            let t = await shop.create(u)
            console.log(t.ops)
            if (debug) console.log('Shop added for ' + u.uid)
            //let viewData = await populateUserShopViewData('\''+u.uid+'\'')
            let viewData = await populateUserShopViewData(u.uid.toString())
            viewData.user = req.user
            viewData.pane = 'ls'
            viewData.messages = { success: 'Product added.' }
            res.render('user/shop', viewData)
        } catch (e) {
            console.error(e)
            res.status(500)
            res.render('error', { title: props.title, user: req.user, messages: { error: 'Unable to complete requested addition of a product.' } })
        }
    }
}


let populateUserShopViewData = async (uid,status = 'active') => {
    return new Promise(async (resolve, reject) => {
        let u = {}
        t = {uid: uid, status: status}
        console.log(t)
        try {
            //u = await shop.read(uid, { findBy: 'uid' })
            s = await shop.read({owner: t.uid})
            console.log(s)
            u = await user.read(uid, {findBy: 'id'})
            console.log(u)
            let viewData = {}
            viewData.title = props.title
            viewData.theme = props.theme
            
            viewData.shops = []
            if(s) {
                if(Array.isArray(s)) {
                    viewData.shops = s
                } else {
                    if (shop.isValid(s)){
                        viewData.shops.push(s)
                    }
                }
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
            viewData.title = props.title
            viewData.theme = props.theme
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
            viewData.verifiedUser = u.verified

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
            resolve(viewData)
        } catch (e) {
            reject(e)
        }
    })
}


// Update shop form handler
let shopUpdateHandler = async (req, res) => {

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
                    if (form.uid != req.user.id) {
                            _403redirect(req, res, '/user/account/?show=em', 'Permission denied.')
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
                        viewData.pane = 'ls'
                        viewData.messages = { success: 'Shop removed and made inactive.' }
                        res.render('sell', viewData)
                    } catch (e) {
                        console.error(e)
                        res.status(500)
                        res.render('error', { title: props.title, user: req.user, messages: { error: 'Unable to complete requested removal.' } })
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
            let panel = 'ci'
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
                        panel = 'ci'
                }
            }
            console.log('Shops Get call..')
            let viewData = {}
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
                  //panel = req.query.panel
                }
            } else {
                viewData = await populateUserShopViewData(req.user.id.toString())
            }
            //viewData = await populateUserShopViewData(req.user.id)
            //let viewData = await populateUserViewData(req.user.id)
            viewData.user = req.user
            viewData.pane = panel
            console.log(viewData)
            console.log(req.query)
            res.render('sell', viewData)
        } else {
            props.messages = {error: "You need to be signed in."}
            res.status(403)
            res.render('signin', props)
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
                case 'np':
                    console.log(req.body)
                    console.log(req.file)
                    //await productAddHandler(req, res)
                    res.status(500)
                    res.render('error', { title: props.title, user: req.user, messages: { error: 'Testing.' } })
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
                    //console.log(req)
                    console.log(req.body)
                    console.log(req.file)
                    await shopAddHandler(req,res)
                    break
                default:
                   console.log(req) 
                   await badRequest(req, res)
            }
        } else {
        _403redirect(req,res,'/user/account','You need to be signed in.')
        }
    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Account update error' }, name: '', user: req.user })
    }
})

module.exports = shops

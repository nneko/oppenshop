const cfg = require('../../configuration')
const validator = require('../../utilities/validator')
const user = require('../../models/user')
const warehouse = require('../../models/warehouse')
const bcrypt = require('bcryptjs')
const express = require('express')
const media = require('../../adapters/storage/media')
const fileUploader = media.uploader()
const converter = require('../../utilities/converter')
const generator = require('../../utilities/generator')
const debug = cfg.env == 'development' ? true : false
//const passport = require('passport')
const currency = require('../../models/currency')
const adminhandler = require('../handlers/admin')
//const ShoppingBag = require('../../models/shoppingbag')

let warehouses = express.Router()

// Render account view for bad request
let badRequest = async (req, res, show, status, msg, msgType) => {
    let verifiedUser = undefined

    typeof (status) === 'number' ? res.status(status) : res.status(400);

    let mtype = 'error'

    typeof (msgType) === 'undefined' ? mtype = 'error' : mtype = msgType;

    let mObj = {}
    mObj[mtype] = msg ? msg : 'Invalid admin request.'

    try {
        if (req.user) {
            //let viewData = await adminhandler.populateUserViewData(req.user.id.toString())
            let viewData = await adminhandler.populateViewData(req.user.id.toString())
            viewData.user = req.user
            viewData.pane = show
            viewData.messages = mObj
            res.render('admin', viewData)
        } else {
            res.render('admin', {user: undefined, pane: show, messages: mObj})
        }

    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', {  user: req.user, error: {message: 'Internal error due to bad request' }})
    }
}

// Render admin view for bad request
let _403redirect = (req, res, url, msg) => {
    let verifiedUser = undefined
    res.status(403);
    res.render('signin', {  url: url, messages: { error: msg ? msg : 'You must be signed in.' }, verifiedUser: verifiedUser })
}

let getField = generator.getField

let getPrimaryField = generator.getPrimaryField

// Add warehouse form handler
let warehouseAddHandler = async (req, res) => {
    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/admin/?show=war', 'You must be signed in.')
        return
    } else {
        console.log('Enter warehouseAddHandler:')
        let u = {}

        let formValidated = false
        let formFields = {}

        if (!req.body) {
            await badRequest(req, res, 'pn', 400, 'Invalid request.')
            return
        }

        let form = converter.objectFieldsToString(req.body)

        if (form.uid != req.user.id.toString()) {
            _403redirect(req, res, '/admin/?show=war', 'Permission denied.')
            return
        }

        if (!validator.isNotNull(form.fullname)) {
            await badRequest(req, res, 'war', 400, 'Warehouse must have a name.')
            return
        }

        //TODO:Validate Owner/UserID - owner
        if (!validator.isNotNull(form.owner)) {
            await badRequest(req, res, 'war', 400, 'Warehouse must have an owner email.')
            return
        }

        if (req.files && validator.isUploadLimitExceeded(req.files)){
            await badRequest(req, res, 'war', 403, 'Upload limits exceeded.')
            return
        }
        console.log(req.body)
        console.log(req.files)
        console.log(req)
        // Read existing stored user details
        //const usr = await user.read(form.uid, { findBy: 'id' })

        //u.preferredUsername = usr.preferredUsername

        //TODO:Validate email address
        //TODO:Validate Phone
        //TODO:Validate Address

        /*
        if (!formValidated) {
            if (debug) {
                console.log('Invalid create warehouse request received.')
            }
            if (!formFields.messages) formFields.messages = { error: 'Request could not be fulfilled.' }
            //let viewData = await adminhandler.populateUserViewData(req.user.id.toString())
            let viewData = await adminhandler.populateViewData(req.user.id.toString())
            viewData.user = req.user
            viewData.pane = 'war'
            viewData.messages = formFields.messages
            viewData.phoneNumber = formFields.phoneNumber
            formFields.status ? res.status(formFields.status) : res.status(400)
            res.render('admin', viewData)
            return
        } else {
            try {
                //await user.update({ preferredUsername: u.preferredUsername }, u)
                let u_phoneaddhandler = await accounthandler.phoneAddHandler(form)
                // TODO: validation check on 'u_phoneaddhandler' response to show response if added or not

                if (debug) console.log('Warehouse created for ' + u.preferredUsername)
                //let viewData = await adminhandler.populateUserViewData(req.user.id.toString())
                let viewData = await adminhandler.populateViewData(req.user.id.toString())
                viewData.user = req.user
                viewData.pane = 'pn'
                viewData.messages = { success: 'Account updated.' }
                res.render('account', viewData)
            } catch (e) {
                console.error(e)
                res.status(500)
                res.render('error', {  user: req.user, error: {message: 'Unable to complete requested update.', status: 500 }})
            }
        }
        */
        try {
            //let t = await shop.create(u)

            let w_addhandler = await adminhandler.warehouseAddHandler(form,req.files)
            if (debug) {
              console.log('Warehouse creation response: ' )
              console.log(w_addhandler)
            }
            let newWarehouse = await warehouse.read(w_addhandler.insertedId, { findBy: 'id' })
            //let newWarehouse = await warehouse.read(w_addhandler.upsertedId, { findBy: 'id' })
            if (debug) {
              console.log('Warehouse read response: ')
              console.log(newWarehouse)
            }
            if(newWarehouse && (await warehouse.isValid(newWarehouse))) {
                if (debug) console.log('Warehouse added for ' + newWarehouse.owner)
                //let viewData = await adminhandler.populateViewData(newShop.owner)
                let viewData = await adminhandler.populateViewData(form.uid)
                viewData.user = req.user
                viewData.pane = 'war'
                viewData.messages = { success: 'Warehouse added.' }
                res.render('admin', viewData)
            } else {
                let sCreateError = new Error('Warehouse creation error')
                sCreateError.name = 'WarehouseError'
                sCreateError.type = 'WarehouseCreateError'
                if(debug) console.error(newWarehouse)
                throw sCreateError
            }
            /*
            let s_addhandler = await shophandler.shopAddHandler(form,req.files)
            let newShop = await shop.read({name: form.fullname ? form.fullname.toLowerCase() : null, owner: form.uid }, { limit: 1 })

            if(newShop && (await shop.isValid(newShop))) {
                if (debug) console.log('Shop added for ' + newShop.owner)
                let viewData = await shophandler.populateViewData(newShop.owner)
                viewData.user = req.user
                viewData.pane = 'sf'
                viewData.messages = { success: 'Shop added.' }
                res.render('sell', viewData)
            } else {
                let sCreateError = new Error('Shop creation error')
                sCreateError.name = 'ShopError'
                sCreateError.type = 'ShopCreateError'
                if(debug) console.error(newShop)
                throw sCreateError
            }
            */
        } catch (e) {
            if(debug) {
                console.log('Error encountered during warehouse creation.')
                console.error(e)
                e.stack ? console.error(e.stack) : console.error('No stack trace.')
            }
            try {
                let viewData = await adminhandler.populateViewData(form.uid)
                viewData.user = req.user
                viewData.pane = 'war'
                //viewData.pane = 'whs-create'
                viewData.messages = {error: 'Operation canceled due to one or more errors.'}
                if (e.name === 'warehouseError') {
                    if(e.type == 'Duplicate') {
                        viewData.messages = { error: 'Cannot create duplicate warehouse.' }
                    }
                    res.status(400)
                    res.render('admin', viewData)
                } else {
                    if(debug) console.log('Unknown error type encountered. Passing to generic error handler.')
                    throw e
                }
            } catch (err) {
                console.error(err)
                res.status(500)
                res.render('error', { user: req.user, error: { message: 'Unable to complete requested warehouse addition.', status: 500 } })
            }
        }

    }
}

// Update warehouse form handler
let warehouseUpdateHandler = async (req, res) => {

    if (!validator.hasActiveSession(req)) {
        _403redirect(req, res, '/admin/?show=whs', 'You must be signed in.')
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
            const s = await warehouse.read(form.wid, { findBy: 'id' })

            console.log(s)
            switch (form.update) {
                case 'open':
                    if (form.uid != req.user.id.toString()) {
                        _403redirect(req, res, '/admin/?show=whs', 'Permission denied.')
                        return
                    }

                    try {
                        let t = await warehouse.update({ _id: s._id }, { status: 'active' })
                        console.log(t)
                        if (debug) console.log('Warehouse status made \'active\' for ' + form.uid)
                        let viewData = await adminhandler.populateViewData(form.uid.toString())
                        viewData.user = req.user
                        viewData.pane = 'whs'
                        viewData.messages = { success: 'Warehouse opened.' }
                        res.render('admin', viewData)
                    } catch (e) {
                        console.error(e)
                        res.status(500)
                        res.render('error', { user: req.user, error: { message: 'Unable to complete requested operation.', status: 500} })
                    }
                    break
                case 'close':
                    if (form.uid != req.user.id.toString()) {
                            _403redirect(req, res, '/admin/?show=whs', 'Permission denied.')
                            return
                    }

                    try {
                        //await shophandler.shopClose(s)
                        await adminhandler.warehouseClose(s)
                        let viewData = await adminhandler.populateViewData(form.uid.toString())
                        viewData.user = req.user
                        viewData.pane = 'whs'
                        viewData.messages = { success: 'Warehouse closed.' }
                        res.render('admin', viewData)
                    } catch (e) {
                        console.error(e)
                        res.status(500)
                        res.render('error', { user: req.user, error: { message: 'Unable to complete requested operation.',status: 500 } })
                    }
                    break
                case 'delete':
                    if (form.uid != req.user.id.toString()) {
                        _403redirect(req, res, '/admin/?show=whs', 'Permission denied.')
                        return
                    }

                    try {
                        //await shophandler.shopDelete(s)
                        await adminhandler.warehouseDelete(s)
                        let viewData = await adminhandler.populateViewData(form.uid.toString())
                        viewData.user = req.user
                        viewData.pane = 'whs'
                        viewData.messages = { success: 'Warehouse deleted.' }
                        res.render('admin', viewData)
                    } catch (e) {
                        if(e && e.name == 'PermissionError') {
                            console.error(e)
                            let viewData = await adminhandler.populateViewData(form.uid.toString())
                            viewData.user = req.user
                            viewData.pane = 'whs'
                            viewData.messages = { error: 'Permission denied. Only closed warehouses with no assign users can be deleted.' }
                            res.render('admin', viewData)
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

warehouses.use('/edit', require('./warehouseeditor'))
warehouses.use('/edit/*', require('./warehouseeditor'))
//warehouses.use('/role/edit', require('./roleeditor'))
//warehouses.use('/role/edit/*', require('./roleeditor'))
//warehouses.use('/permission/edit', require('./permissioneditor'))
//warehouses.use('/permission/edit/*', require('./permissioneditor'))
warehouses.use('/page/:page', async function(req, res, next) {
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
                  case 'whs':
                  /*case 'in':
                  case 'pd':
                  case 'cl':
                  case 'pd-new':
                  case 'or':
                  case 'pkg':
                  case 'py':*/
                      panel = qd.show
                      break
                  default:
                      panel = 'sf'
              }
          }
          let viewData = {}
          console.log('Page: ' +page)
          viewData = await adminhandler.populateViewData(req.user.id.toString(), status = 'active', warehouse_page = parseInt(page))
          viewData.user = req.user
          viewData.pane = panel
          res.render('admin', viewData)
      } else {
          messages = {error: "You need to be signed in."}
          res.status(403)
          res.render('signin', {messages: messages})
      }
  } catch (e) {
      console.error(e)
      res.status(500)
      res.render('error', { error: { status: 500, message: 'Error retrieving warehouse pagination data' }, name: '', user: req.user })

  }
})

warehouses.get('/', async (req, res) => {
    try {
        if (validator.hasActiveSession(req)) {
            let qd = req.query
            let panel = 'pkg'
            if(qd) {
                switch(qd.show){
                    case 'whs':
                    case 'rol':
                    case 'per':
                    /*case 'ls':
                    case 'ad':
                    case 'em':
                    case 'pn':
                    case 'or':
                    case 'pm':
                    case 'pr':*/
                        panel = qd.show
                        break
                    default:
                        panel = 'pkg'
                }
            }
            //let viewData = await adminhandler.populateUserViewData(req.user.id.toString())
            let viewData = await adminhandler.populateViewData(req.user.id.toString())
            viewData.user = req.user
            viewData.pane = panel
            res.render('admin', viewData)
        } else {
            messages = {error: "You need to be signed in."}
            res.status(403)
            res.render('signin', {messages: messages})
        }
    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { status: 500, error: {message: 'Error retrieving admin data'} , name: '', user: req.user })

    }
})

warehouses.post('/', fileUploader, async (req, res) => {
    try {
        if (validator.hasActiveSession(req)) {
            let form = req.body

            // Check form id and pass off to appropriate form handler. Otherwise if no handler found render account page with unable to process request error message
            switch (form.id) {
                case 'whs-create':
                    console.log('Entering whs-create')
                    await warehouseAddHandler(req, res)
                    break
                case 'up-whs':
                    await warehouseUpdateHandler(req, res)
                    break
                case 'edit-whs':
                    await warehouseEditHandler(req, res)
                    break
                case 'del-whs':
                    await warehouseDelHandler(req, res)
                    break
                /*case 'ls':
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
                case 'upaddr':
                    await addressUpdateHandler(req, res)
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
                    break*/
                default:
                    await badRequest(req, res)
            }
        } else {
        _403redirect(req,res,'/admin','You need to be signed in.')
        }
    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: {status: 500, message: 'Warehouse update error'}, name: '', user: req.user })
    }
})

module.exports = warehouses

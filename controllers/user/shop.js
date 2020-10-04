const cfg = require('../../configuration')
const validator = require('../../utilities/validator')
const user = require('../../models/user')
const shop = require('../../models/shop')
const product = require('../../models/product')
const express = require('express')
const converter = require('../../utilities/converter')
const generator = require('../../utilities/generator')
const media = require('../../adapters/storage/media')
const debug = cfg.env == 'development' ? true : false
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
const shophandler = require('../handlers/shop')
const { update } = require('../../models/user')
const idx = cfg.indexerAdapter ? require('../../adapters/indexer/' + cfg.indexerAdapter) : null
const productIdx = cfg.indexerProductIndex ? cfg.indexerProductIndex : 'products-index'

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

            let c_addhandler = await shophandler.catalogAddHander(form,req.files)
            // TODO: validation check on 'c_addhandler' response to show response if created or not
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
            res.render('error', { user: req.user, messages: { error: 'Unable to complete requested addition of a catalog.' } })
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
            res.render('error', { user: req.user, messages: { error: 'Unable to complete requested addition of a catalog.' } })
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
            res.render('error', { user: req.user, messages: { error: 'Unable to complete requested product addition to catalog.' } })
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
            res.render('error', { user: req.user, messages: { error: 'Unable to complete requested product addition to catalog.' } })
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
            // TODO: validation check on 's_addhandler' response to show response if created or not

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
            try {
                let newProd = await product.read({ name: String(form.fullname).toLowerCase() }, { limit: 1 })

                if (result && await product.isValid(newProd)) {
                    if (debug) {
                        console.log('Attempting to index new product ' + newProd._id + '.')
                    }
                    let idx_res = await idx.index(productIdx, {
                        ref: newProd._id,
                        name: newProd.name,
                        description: newProd.description,
                        specifications: newProd.specifications,
                        quantity: newProd.quantity,
                        price: Number(newProd.price),
                        currency: newProd.currency
                    })
                    if (debug) {
                        console.log('Indexer response ' + idx_res)
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
            if (debug) {
                console.log('Added product: ')
                console.log(p)
                console.log('Product added for Shop:' + form.sid)
            }
            let viewData = await shophandler.populateViewData(form.uid.toString())
            viewData.user = req.user
            //viewData.pane = 'in'
            viewData.pane = 'pd-new'
            viewData.messages = { success: 'Product added.' }
            res.render('sell', viewData)
        } catch (e) {
            console.error(e)
            e.stack ? console.error(e.stack) : console.error('No stack trace.')
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
                        let viewData = await shophandler.populateViewData(form.uid.toString())
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
                        let viewData = await shophandler.populateViewData(form.uid.toString())
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
                            let viewData = await shophandler.populateViewData(form.uid.toString())
                            viewData.user = req.user
                            viewData.pane = 'sf'
                            viewData.messages = { success: 'Shop deleted.' }
                            res.render('sell', viewData)
                        } else {
                            let viewData = await shophandler.populateViewData(form.uid.toString())
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
                            let viewData = await shophandler.populateViewData(form.uid.toString())
                            viewData.user = req.user
                            viewData.pane = 'in'
                            viewData.messages = { success: 'Product deleted.' }
                            res.render('sell', viewData)
                            try {
                                if (debug) {
                                    console.log('Removing product ref ' + p._id + 'from to index')
                                }
                                let idx_res = await idx.deleteMatches(productIdx, {
                                    ref: p._id
                                })
                                if (debug) {
                                    console.log('Indexer response ' + idx_res)
                                }
                            } catch (err) {
                                console.log('Error on index update.')
                                console.error(err)
                                err.stack ? console.error(err.stack) : console.error('No stack trace.')
                            }
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
                                console.log('Indexer response ' + idx_res)
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
                                console.log('Indexer response ' + idx_res)
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
                        res.render('error', { user: req.user, messages: { error: 'Unable to complete requested operation.' } })
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
  }
  })
})

module.exports = shops

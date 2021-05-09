const cfg = require('../../configuration')
const validator = require('../../utilities/validator')
const shop = require('../../models/shop')
const user = require('../../models/user')
const warehouse = require('../../models/warehouse')
const express = require('express')
const converter = require('../../utilities/converter')
const generator = require('../../utilities/generator')
const media = require('../../adapters/storage/media')
const debug = cfg.env == 'development' ? true : false
const { removePrimaryFields } = require('../../utilities/generator')
const fileUploader = media.uploader()

let warehouseeditor = express.Router()

// Render view for bad request
let badRequest = async (req, res, show, status, msg, msgType, warehouseid) => {

    typeof (status) === 'number' ? res.status(status) : res.status(400);

    let mtype = 'error'

    typeof (msgType) === 'undefined' ? mtype = 'error' : mtype = msgType;

    let mObj = {}
    mObj[mtype] = msg ? msg : 'Invalid request.'

    try {
        let viewData = await populateViewData(warehouseid)
        viewData.user = req.user
        viewData.pane = typeof (show) == 'string' && show !== "" ? show : 'disabled'
        viewData.messages = mObj
        res.render('edit_warehouse', viewData)
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
          let w = await warehouse.read(id,{findBy: 'id'})
          let usr = await user.read(w.owner, {findBy: 'id'})
          let viewData = {}
          if (w){
            viewData.id = w._id
            viewData.name = { value: w.name }
            viewData.displayName = { value: w.displayName }
            viewData.images = []
            if (Array.isArray(w.images)) {
                for (const img of w.images) {
                    let i = img
                    i.src = media.read(img)
                    viewData.images.push(i)
                }

                let primaryImgIdx = generator.getPrimaryFieldIndex(w.images)
                if (primaryImgIdx > 0) {
                    let imgs = []
                    imgs.push(viewData.images[primaryImgIdx])
                    for(let idx=0;idx < w.images.length;idx++) {
                        if(idx != primaryImgIdx) {
                            imgs.push(viewData.images[idx])
                        }
                    }
                    viewData.images = imgs
                }
            }
            // TODO: Load 'staff' details...

          }
          resolve(viewData)
        } catch (e) {
            reject(e)
        }
    })
}

warehouseeditor.get('/', async (req, res) => {
    try {
        if (validator.hasActiveSession(req)) {
            if (req.query && req.query.w) {
                try {
                    let viewData = await populateViewData(req.query.w)
                    viewData.user = req.user
                    console.log(viewData)
                    res.render('edit_warehouse', viewData)
                } catch (e) {
                    console.error(e)
                    await badRequest(req, res, 'disabled', 404,'Unable to retrieve data for warehouse '+req.query.w)
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


warehouseeditor.post('/', fileUploader, async (req, res) => {
    try {
        if (validator.hasActiveSession(req)) {
            let form = converter.objectFieldsToString(req.body)

            let formValidated = false
            let formFields = {}

            if (!req.body) {
                await badRequest(req, res, 'disabled', 400, 'Invalid request.')
                return
            }

            if (form.uid != req.user.id.toString()) {
                _403redirect(req, res, '/admin/?show=whs', 'Permission denied.')
                return
            }

            if (!validator.isNotNull(form.id)) {
                await badRequest(req, res, '', 400, 'Invalid warehouse id.')
                return
            }




        } else {
            _403redirect(req, res, '/admin', 'You need to be signed in.')
        }
  } catch (e) {
      console.error(e)
      res.status(500)
      res.render('error', { error: { status: 500, message: 'Warehouse editor error' }, name: '', user: req.user })
  }
})

module.exports = warehouseeditor

const cfg = require('../../configuration/index.js')
const validator = require('../../utilities/validator')
const user = require('../../models/user')
const parcel = require('../../models/parcel')
const currency = require('../../models/currency')
const warehouse = require('../../models/warehouse')
const express = require('express')
const media = require('../../adapters/storage/media')
const debug = cfg.env == 'development' ? true : false

let parcels = express.Router()

parcels.get('/', async (req, res) => {
  if (debug) {
    console.log(req.query)
    console.log(req.session)
  }
  if (validator.hasActiveSession(req)){
    //req.session.token = req.query.sid
    //const accessTokenUser = jwt.authenticateTokenFromSession(req, res)
    //console.log(accessTokenUser)
    if (req.query.uid.length == 12 || req.query.uid.length == 24){
      if (validator.isNotNull(req.query.uid) && (typeof (req.query.uid) == 'String')) {

        let t = {}
        let u = await user.read(req.query.uid.toString(), { findBy: 'id' })

        if(req.user.id != req.query.uid) {
          if(!validator.isSuperUser(u)) {
            if(validator.isNotNull(req.query.warehouse)) {
              let w = await warehouse.read(req.query.warehouse, {findBy: 'id'})
              if (! await warehouse.isValid(w) && validator.isWarehouseAdmin(w, u)) {
                res.status(403)
                res.json({ error: 'Permission denied' })
            } else {
              res.status(403)
              res.json({error: 'Permission denied'})
            }
          }
        } else {
          t.owner = req.query.uid
        }

        if (validator.isNotNull(req.query.warehouse)) t.warehouse = req.query.warehouse
        if (validator.isNotNull(req.query.status)) t.status = req.query.status
        let perPage = cfg.items_per_page ? cfg.items_per_page : 2 // 12
        let parcel_page = req.query.page ? Number(req.query.page) : 1
        let o_parcel = null
        let pagination = true
        if (pagination) {
          o_parcel = { pagination_skip: parcel_page, pagination_limit: perPage}
        }
        if (debug) {
          console.log(t)
          console.log(o_parcel)
        }
        
        let p = await parcel.read(t,o_parcel)
        p_count = await parcel.count(t,o_parcel)
        let total_pages = Math.ceil(p_count / perPage)
        if (parcel_page > total_pages) parcel_page = total_pages
        if (debug) {
          console.log(p)
          console.log(p_count)
          console.log(total_pages)
          console.log(parcel_page)
        }
        res.status(200)
        res.json({message: 'Success', parcels: p, total_parcels: p_count, total_pages: total_pages, current_page: parcel_page})
        //res.json({message: 'Success'})
      } else {
        res.status(400)
        res.json({error: 'Bad Query Parameter - UserID(uid): Not resolving'})
      }
    } else {
      res.status(400)
      res.json({error: 'Bad Query Parameter - UserID(uid): Argument passed in must be a single String of 12 bytes or a string of 24 hex characters'})
    }
  } else {
      res.status(403)
      res.json({error: 'Permission denied'})
  }

})

parcels.use((req, res) => {
    res.status(405)
    res.json({ error: 'Method Not Allowed' })
})

module.exports = parcels

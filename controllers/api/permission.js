const cfg = require('../../configuration/index.js')
const validator = require('../../utilities/validator')
const user = require('../../models/user')
const permission = require('../../models/permission')
const media = require('../../adapters/storage/media')
const express = require('express')
const path = require('path')
const jwt = require('../../adapters/authorization/jwt')
const debug = cfg.env == 'development' ? true : false

let permissions = express.Router()

permissions.get('/', async (req, res) => {
  if (debug) {
    console.log(req.query)
    console.log(req.session)
  }
  if (validator.isNotNull(req.query.sid) && validator.isNotNull(req.query.uid)){
    //req.session.token = req.query.sid
    //const accessTokenUser = jwt.authenticateTokenFromSession(req, res)
    //console.log(accessTokenUser)
    if (req.query.uid.length == 12 || req.query.uid.length == 24){
      let u = await user.read(req.query.uid.toString(),{findBy: 'id'})
      if (validator.isNotNull(u)) { //add user roles check if 'super-admin'
        //let t = { owner: u._id.toString() } //TODO: double if empty or supplied by user
        let t = { status: 'active' } //TODO: double if empty or supplied by user
        if (req.query.status) t.status = req.query.status
        let perPage = cfg.items_per_page ? cfg.items_per_page : 2 // 12
        let permission_page = req.query.page ? Number(req.query.page) : 1
        let o_permission = null
        let pagination = true
        if (pagination) {
          o_permission = { pagination_skip: permission_page, pagination_limit: perPage}
        }
        if (debug) {
          console.log(t)
          console.log(o_permission)
        }
        p = await permission.read(t,o_permission)
        /*
        for (const x of w) {
            if (Array.isArray(x.images) && x.images.length > 0) {
                for (const xx of x.images) {
                  xx.src = media.read(xx)
                }
            }
        }
        */
        p_count = await permission.count(t,o_permission)
        let total_pages = Math.ceil(p_count / perPage)
        if (permission_page > total_pages) permission_page = total_pages
        if (debug) {
          //console.log(s)
          console.log(p_count)
          console.log(total_pages)
          console.log(permission_page)
        }
        res.status(200)
        res.json({message: 'Success', permissions: p, total_permissions: p_count, total_pages: total_pages, current_page: permission_page})
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
      res.status(400)
      if (validator.isEmpty(req.query.sid)) {
        res.json({error: 'Bad Request - Missing SessionID(sid)'})
      } else if (validator.isEmpty(req.query.uid)) {
        res.json({error: 'Bad Request - Missing UserID(uid)'})
      } else {
        res.json({error: 'Bad Request'})
      }
  }

})

permissions.use((req, res) => {
    res.status(405)
    res.json({ error: 'Method Not Allowed' })
})

module.exports = permissions

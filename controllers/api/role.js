const cfg = require('../../configuration/index.js')
const validator = require('../../utilities/validator')
const user = require('../../models/user')
const role = require('../../models/role')
const media = require('../../adapters/storage/media')
const express = require('express')
const path = require('path')
const jwt = require('../../adapters/authorization/jwt')
const debug = cfg.env == 'development' ? true : false

let roles = express.Router()

roles.get('/', async (req, res) => {
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
        let role_page = req.query.page ? Number(req.query.page) : 1
        let o_role = null
        let pagination = true
        if (pagination) {
          o_role = { pagination_skip: role_page, pagination_limit: perPage}
        }
        if (debug) {
          console.log(t)
          console.log(o_role)
        }
        w = await role.read(t,o_role)
        /*
        for (const x of w) {
            if (Array.isArray(x.images) && x.images.length > 0) {
                for (const xx of x.images) {
                  xx.src = media.read(xx)
                }
            }
        }
        */
        r_count = await role.count(t,o_role)
        let total_pages = Math.ceil(r_count / perPage)
        if (role_page > total_pages) role_page = total_pages
        if (debug) {
          //console.log(s)
          console.log(r_count)
          console.log(total_pages)
          console.log(role_page)
        }
        res.status(200)
        res.json({message: 'Success', roles: w, total_roles: r_count, total_pages: total_pages, current_page: role_page})
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

roles.use((req, res) => {
    res.status(405)
    res.json({ error: 'Method Not Allowed' })
})

module.exports = roles

const cfg = require('../../configuration/index.js')
const validator = require('../../utilities/validator')
const user = require('../../models/user')
const shop = require('../../models/shop')
const product = require('../../models/product')
const currency = require('../../models/currency')
const express = require('express')
const media = require('../../adapters/storage/media')
const debug = cfg.env == 'development' ? true : false

let products = express.Router()

products.get('/', async (req, res) => {
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
      if (validator.isNotNull(u)) {
        let t = {}
        if (req.query.shop) {
          t.shop = req.query.shop
        } else {
          s = await shop.read({ owner: u._id.toString() })
          //console.log(typeof s)
          //console.log(s.map(a => a._id.toString()))
          t.shop = { $in: s.map(a => a._id.toString())}
        }
        if (req.query.status) t.status = req.query.status
        let perPage = cfg.items_per_page ? cfg.items_per_page : 2 // 12
        let product_page = req.query.page ? Number(req.query.page) : 1
        let o_product = null
        let pagination = true
        if (pagination) {
          o_product = { pagination_skip: product_page, pagination_limit: perPage}
        }
        if (debug) {
          console.log(t)
          console.log(o_product)
        }
        //Populate the currency list
        currency_list = {}
        let c = await currency.read({ status: 'active' })
        if (c) {
            if (Array.isArray(c)) {
                for (let cIdx=0;cIdx < c.length; cIdx++) {
                    if(currency.isValid(c[cIdx])) {
                        currency_list[c[cIdx]._id.toString()] = c[cIdx]
                    }
                }
            }
        }
        p = await product.read(t,o_product)
        for (const y of p) {
            if (Array.isArray(y.images) && y.images.length > 0) {
                for (const yy of y.images) {
                  yy.src = media.read(yy)
                }
            }
            if(y.currency) y.currency = currency_list[y.currency]
        }
        p_count = await product.count(t,o_product)
        let total_pages = Math.ceil(p_count / perPage)
        if (product_page > total_pages) product_page = total_pages
        if (debug) {
          console.log(p)
          console.log(p_count)
          console.log(total_pages)
          console.log(product_page)
        }
        res.status(200)
        res.json({message: 'Success', products: p, total_products: p_count, total_pages: total_pages, current_page: product_page})
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

products.use((req, res) => {
    res.status(405)
    res.json({ error: 'Method Not Allowed' })
})

module.exports = products

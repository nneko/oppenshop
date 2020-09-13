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

let shophandler = {}

shophandler.populateViewData = async (uid, status = 'active', shop_page = 1, product_page = 1, catalog_page = 1) => {
    return new Promise(async (resolve, reject) => {
        t = { owner: uid }
        let perPage = cfg.items_per_page ? cfg.items_per_page : 12
        pagination = true
        o_shop = null
        console.log('Page: ' +shop_page)
        if (pagination) {
          o_shop = { pagination_skip: shop_page, pagination_limit: perPage}
        }

        console.log('Populating view for shop owner: ' + t.owner)
        console.log(t)
        console.log(o_shop)
        try {

            s = await shop.read(t,o_shop)
            s_count = await shop.count(t,o_shop)
            //console.log(s)
            console.log(s_count)
            let viewData = {}

            viewData.shops = []
            if (s) {
                if (Array.isArray(s)) {
                    for (const x of s) {
                        if (Array.isArray(x.images) && x.images.length > 0) {
                            for (const xx of x.images) {
                                xx.src = media.getBinaryDetails(xx)
                            }
                        }
                        let p = await product.read({ shop: x._id.toString() })
                        for (const y of p) {
                            if (Array.isArray(y.images) && y.images.length > 0) {
                                for (const yy of y.images) {
                                  yy.src = media.getBinaryDetails(yy)
                                }
                            }
                        }
                        x.products = p
                    }
                    viewData.shops = s
                } else if(await shop.isValid(s)) {
                    if (Array.isArray(s.images) && s.images.length > 0) {
                        for (const sxx of s.images) {
                            sxx.src = media.getBinaryDetails(sxx)
                        }
                    }
                    let sp = await product.read({ shop: s._id.toString() })
                    for (const sy of sp) {
                        if (Array.isArray(sy.images) && sy.images.length > 0) {
                            for (const syy of sy.images) {
                                syy.src = media.getBinaryDetails(syy)
                            }
                        }
                    }
                    s.products = sp

                    viewData.shops = [s]
                }
            }

            viewData.catalogs = []
            for (let i = 0; i < viewData.shops.length; i++) {
                try {
                    if (await shop.isValid(viewData.shops[i])) {
                        let cFilter = { owner: viewData.shops[i]._id.toString() }
                        if(debug) {
                            console.log('Searching for catalogs using filter:')
                            console.log(cFilter)
                        }
                        let cList = await catalog.read(cFilter)
                        if (Array.isArray(cList) && cList.length > 0) {
                            if(debug) {
                                console.log('Catalog list found: ')
                                console.log(cList)
                            }
                            for (let j = 0; j < cList.length; j++) {
                                if (await catalog.isValid(cList[j])) {
                                    if(typeof(cList[j].image) !== 'undefined') {
                                        cList[j].image.src = media.getBinaryDetails(cList[j].image)
                                    }
                                    if(cList[j].products.length > 0) {
                                        let pList = []
                                        for (const item of cList[j].products) {
                                            let p = await product.read(item,{findBy: 'id'})
                                            if(await product.isValid(p)) {
                                                if (typeof (p.images) !== 'undefined' && Array.isArray(p.images)) {
                                                    for (const pImg of p.images) {
                                                        pImg.src = media.getBinaryDetails(pImg)
                                                    }
                                                }
                                                pList.push(p)
                                            }
                                        }
                                        cList[j].products = pList
                                    }
                                    if(debug) console.log('Adding 1 item to catalog list')
                                    viewData.catalogs.push(cList[j])
                                }
                            }
                        } else if (await catalog.isValid(cList)) {
                            if (debug) {
                                console.log('Single catalog found: ')
                                console.log(cList)
                            }
                            if (typeof (cList.image) !== 'undefined') {
                                cList.image.src = media.getBinaryDetails(cList.image)
                            }
                            let pList = []
                            if (cList.products.length > 0) {
                                for (const item of cList.products) {
                                    let p = await product.read(item, { findBy: 'id' })
                                    if (await product.isValid(p)) {
                                        if (typeof (p.images) !== 'undefined' && Array.isArray(p.images)) {
                                            for (const pImg of p.images) {
                                                pImg.src = media.getBinaryDetails(pImg)
                                            }
                                        }
                                        pList.push(p)
                                    }
                                }
                            }
                            cList.products = pList
                            viewData.catalogs.push(cList)
                        }
                    }
                } catch (e) {
                    console.error(e)
                    console.log('Error reading shop list skipping remainder.')
                }
            }
            // Pagination details
            if (pagination){
              viewData.shops_pages = Math.ceil(s_count / perPage)
              viewData.shops_current = shop_page

            }
            if(debug) {
                console.log('View Data: ')
                console.log(viewData)
                console.log('Controllers/Hanlders: PopulateViewData')
            }
            resolve(viewData)
        } catch (e) {
            reject(e)
        }
    })
}

shophandler.catalogAddHander = async (form, files) => {
  try {
    let c = {}
    c.name = form.name
    c.description = form.description
    c.owner = form.sid
    c.products = []
    if (files) {
        for (x of files) {
            x.storage = 'db'
        }
        console.log(files)
        if(Array.isArray(files) && files.length >= 1) c.image = files[0]
    }
    return await catalog.create(c)
  } catch (e) {
      console.error(e)
      throw e
  }
}

shophandler.catalogDeleteHander = async (form) => {
  try {
    let ctg = await catalog.read(form.cid,{findBy: 'id'})

    return await catalog.delete(ctg)
  } catch (e) {
      console.error(e)
      throw e
  }
}

shophandler.catalogAddProductHander = async (form) => {
  try {
    const ctg = await catalog.read(form.cid, { findBy: 'id' })
    let c = {}
    c.products = []
    c.products = ctg.products
    for (const f of Object.keys(form)) {
        let fParts = f.split('-')
        if(fParts.length == 2) {
            let cid = fParts[0]
            let pid = fParts[1]
            if(cid == form.cid) {
                if(debug) console.log('Looking up details for product ' + pid)
                let p = await product.read(pid, { findBy: 'id' })
                if (await product.isValid(p)) {
                    if(debug) console.log('Adding product ' + pid + ' to catalog product listing for ' + cid)
                    c.products.push(p._id.toString())
                }
            }
        }
    }

    //let updated_ctg = await catalog.update({_id: ctg._id},c)
    return await catalog.update({_id: ctg._id},c)
  } catch (e) {
      console.error(e)
      throw e
  }
}

shophanlder.catalogDeleteProductHandler = async (form) => {
  try {
    const ctg = await catalog.read(form.cid, { findBy: 'id' })
    let c = {}
    c.products = []

    let cid = form.cid
    let pid = form.pid
    let p = await product.read(pid, { findBy: 'id' })
    if (await product.isValid(p)) {
        if (debug) console.log('Removing product entries for ' + pid + ' in catalog ' + cid)
        for (const item of ctg.products) {
            if(item !== pid) c.products.push(item)
        }
    }

    //let updated_ctg = await catalog.update({ _id: ctg._id }, c)

    return await catalog.update({ _id: ctg._id }, c)
  } catch (e) {
      console.error(e)
      throw e
  }
}

shophandler.shopAddHandler = async (form, files) => {
  try {
    let u = {}
    // Read existing stored user details
    const usr = await user.read(form.uid, { findBy: 'id' })

    u.owner = form.uid
    u.name = form.fullname
    u.displayName = form.fullname
    u.status = 'active'
    //if (typeof(req.file) !== 'undefined'){
    if (files){
        for (x of files){
          x.storage = 'db'
        }
        console.log(files)
        u.images = files
    }

    let addr = {}
    addr.type = form.addressType
    addr.streetAddress = form.addressStreet
    addr.locality = form.addressLocality
    addr.region = form.addressRegion
    addr.postalCode = form.addressPostcode
    addr.country = form.addressCountry
    addr.formatted = generator.formattedAddress(addr)

    if (form.setPrimary != 'true'){
        u.addresses = usr.addresses
        u.addresses.push(addr)
    } else {
        addr.primary = true
        if (typeof(usr.addresses) !== 'undefined') {
            u.addresses = generator.removePrimaryFields(usr.addresses)
            u.addresses.push(addr)
        } else {
            u.addresses = [addr]
        }
    }
    return await shop.create(u)
  } catch (e) {
      console.error(e)
      throw e
  }
}

shophandler.productAddHandler = async (form, files) => {
  try {
    let p = {}
    p.shop = form.sid
    p.name = form.fullname
    p.description = form.description
    p.status = 'active'
    p.quantity = form.quantity ? Number(form.quantity) : 0
    p.price = generator.roundNumber( form.unit_dollar && form.unit_cents ? Number(form.unit_dollar + '.' + form.unit_cents): 0, 2)
    p.currency = form.currency ? form.currency : 'jmd'
    if (form.name !== 'undefined'){
      p.displayName = form.name

    }

    if (req.files){
        for (x of req.files){
          x.storage = 'db'
        }
        p.images = req.files
    }
    let specs = {}
    for (key in form){
      if (!key.startsWith('spec_')) continue
      specs[key.replace('spec_', '')] = form[key]
    }
    p.specifications = specs
    return await shop.read(p.shop,{findBy: 'id'})
  } catch (e) {
      console.error(e)
      throw e
  }
}


module.exports = shophandler

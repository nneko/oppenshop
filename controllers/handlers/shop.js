const cfg = require('../../configuration')
const user = require('../../models/user')
const shop = require('../../models/shop')
const product = require('../../models/product')
const generator = require('../../utilities/generator')
const media = require('../../adapters/storage/media')
const debug = cfg.env == 'development' ? true : false
const catalog = require('../../models/catalog')
const currency = require('../../models/currency')
const validator = require('../../utilities/validator')

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

            //Populate the currency list
            viewData.currency_list = {}
            let c = await currency.read({ status: 'active' })
            if (c) {
                if (Array.isArray(c)) {
                    for (let cIdx=0;cIdx < c.length; cIdx++) {
                        if(currency.isValid(c[cIdx])) {
                            viewData.currency_list[c[cIdx]._id.toString()] = c[cIdx]
                        }
                    }
                }
            }

            viewData.shops = []
            if (s) {
                if (Array.isArray(s)) {
                    for (const x of s) {
                        if (Array.isArray(x.images) && x.images.length > 0) {
                            for (const xx of x.images) {
                                xx.src = media.read(xx)
                                console.log(xx)
                            }
                        }
                        let p = await product.read({ shop: x._id.toString() })
                        for (const y of p) {
                            if (Array.isArray(y.images) && y.images.length > 0) {
                                for (const yy of y.images) {
                                  yy.src = media.read(yy)
                                }
                            }
                            if(y.currency) y.currency = viewData.currency_list[y.currency]
                        }
                        x.products = p
                    }
                    viewData.shops = s
                } else if(await shop.isValid(s)) {
                    if (Array.isArray(s.images) && s.images.length > 0) {
                        for (const sxx of s.images) {
                            sxx.src = media.read(sxx)
                        }
                    }
                    let sp = await product.read({ shop: s._id.toString() })
                    for (const sy of sp) {
                        if (Array.isArray(sy.images) && sy.images.length > 0) {
                            for (const syy of sy.images) {
                                syy.src = media.read(syy)
                            }
                        }
                        if(sy.currency) sy.currency = viewData.currency_list[sy.currency]
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
                        let cList = await catalog.read(cFilter)
                        if (Array.isArray(cList) && cList.length > 0) {
                            for (let j = 0; j < cList.length; j++) {
                                if (await catalog.isValid(cList[j])) {
                                    if(typeof(cList[j].image) !== 'undefined') {
                                        cList[j].image.src = media.read(cList[j].image)
                                    }
                                    if(cList[j].products.length > 0) {
                                        let pList = []
                                        for (const item of cList[j].products) {
                                            let p = await product.read(item,{findBy: 'id'})
                                            if(await product.isValid(p)) {
                                                if (typeof (p.images) !== 'undefined' && Array.isArray(p.images)) {
                                                    for (const pImg of p.images) {
                                                        pImg.src = media.read(pImg)
                                                    }
                                                }
                                                if(p.currency) p.currency = viewData.currency_list[p.currency]
                                                pList.push(p)
                                            }
                                        }
                                        cList[j].products = pList
                                    }
                                    viewData.catalogs.push(cList[j])
                                }
                            }
                        } else if (await catalog.isValid(cList)) {
                            if (typeof (cList.image) !== 'undefined') {
                                cList.image.src = media.read(cList.image)
                            }
                            let pList = []
                            if (cList.products.length > 0) {
                                for (const item of cList.products) {
                                    let p = await product.read(item, { findBy: 'id' })
                                    if (await product.isValid(p)) {
                                        if (typeof (p.images) !== 'undefined' && Array.isArray(p.images)) {
                                            for (const pImg of p.images) {
                                                pImg.src = media.read(pImg)
                                            }
                                        }
                                        if (p.currency) p.currency = viewData.currency_list[p.currency]
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
    /*
    let cImgs = []
    if (files) {
        for (x of files) {
            x.storage = cfg.media_datastore ? cfg.media_datastore : 'db'
            let img = await media.write(x, cfg.media_dest_products ? cfg.media_dest_catalogs : '/catalog')
            cImgs.push(img)
        }
        if (Array.isArray(cImgs) && cImgs.length >= 1) c.image = cImgs[0]
    }
    */
   c.image = null
    
    let result = await catalog.create(c)

    let newCtg = await catalog.read(c, { limit: 1 })
    if (result && newCtg && await catalog.isValid(newCtg)) {
          // Save catalog images
          let cImgs = []
        if (files && Array.isArray(files)) {
            for (x of files) {
                let img = {}
                x.storage = cfg.media_datastore ? cfg.media_datastore : 'db'
                if (x.storage != 'db') {
                    img = await media.write(x, (cfg.media_dest_products ? cfg.media_dest_products : '/catalog') + '/' + String(newCtg._id) + '/' + (x.originalname ? x.originalname : generator.uuid()))
                } else {
                    img = x
                }
                cImgs.push(img)
            }
        }
        if (debug) console.log('Saving new catalog images')
        let catalogImageSaveResult = await catalog.update(newCtg, {images: cImgs})
        if (debug) console.error(catalogImageSaveResult)
        return catalogImageSaveResult
    } else {
        if(debug) console.error(result)
        return false
    }
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

shophandler.catalogAddProductHandler = async (form) => {
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

shophandler.catalogDeleteProductHandler = async (form) => {
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
    let s = {}
    // Read existing stored user details
    const usr = await user.read(form.uid, { findBy: 'id' })

    s.owner = form.uid
    s.name = form.fullname
    s.displayName = form.fullname
    s.description = form.description
    s.status = 'active'
    s.images = []
    s.phoneNumbers = []

    if(form.phoneNumber && validator.isPhoneNumber(form.phoneNumber)) {
        s.phoneNumbers.push({
            value: form.phoneNumber,
            type: 'main',
            primary: true
        })
    }

    let addr = {}
    addr.type = form.addressType
    addr.streetAddress = form.addressStreet
    addr.secondStreetAddress = form.secondAddressStreet
    addr.locality = form.addressLocality
    addr.region = form.addressRegion
    addr.postalCode = form.addressPostcode
    addr.country = form.addressCountry
    addr.formatted = generator.formattedAddress(addr)
    addr.primary = true

    if (!form.setPrimary) {
        s.addresses = []
        s.addresses.push(addr)
    } else {
        if (typeof (usr.addresses) !== 'undefined' && Array.isArray(usr.addresses) && usr.addresses.length > 0) {
            s.addresses = []
            let usrPrimaryAddr = generator.getPrimaryField(usr.addresses)
            if(usrPrimaryAddr) {
                s.addresses.push(usrPrimaryAddr)
            } else {
                s.addresses = [addr]
            }
        } else {
            s.addresses = [addr]
        }
    }
    if (debug) console.log('Attempting to create new shop...')
    let createResult = await shop.create(s)
    let newShop = await shop.read(s, { limit: 1 })

      if (createResult && newShop && (await shop.isValid(newShop))) {
        // Save shop images
        let sImgs = []
        if (files && Array.isArray(files)) {
            for (x of files) {
                let img = {}
                x.storage = cfg.media_datastore ? cfg.media_datastore : 'db'
                if (x.storage != 'db') {
                    img = await media.write(x, (cfg.media_dest_shops ? cfg.media_dest_shops : '/shop') + '/' + String(newShop._id) + '/' + (x.originalname ? x.originalname : generator.uuid()))
                } else {
                    img = x
                }
                sImgs.push(img)
            }
        }
        if (debug) console.log('Saving new shop images...')
        let shopImageSaveResult = await shop.update(newShop, {images: sImgs})
        if (debug) console.error(shopImageSaveResult)
        return shopImageSaveResult
    } else {
        if(debug) console.log(newShop)
        return false
    }
  } catch (e) {
      console.error(e)
      throw e
  }
}

shophandler.shopClose = async (s) => {
    try {
        if(! await shop.isValid(s)) {
            let err = new Error('Not a valid shop')
            err.name = 'ShopError'
            err.type = 'Invalid'
            throw err
        }

        let result = await shop.update({ _id: s._id }, { status: 'inactive' })
        if (debug) console.log(result)

        //Retrieve all the shop's products
        let sProducts = await product.read({ shop: String(s._id) })

        if (sProducts && (!Array.isArray(sProducts))) {
            sProducts = [sProducts]
        }

        if (debug) {
            console.log(s.displayName + ' has ' + sProducts.length + ' products.')
        }

        //Withdraw all the shops products from the market
        for (const p of sProducts) {
            if (await product.isValid(p) && p.status != 'inactive') {
                if (debug) console.log('Withdrawing product ' + p.displayName + ' ' + String(p._id))
                await product.update({ name: p.name, shop: String(s._id) }, { status: 'inactive' })
            }
        }

        if (debug) console.log('Shop: ' + String(s._id) + ' status \'inactive\'.')
    } catch (e) {
        throw e
    }
}

shophandler.shopDelete = async (s) => {
    try {
        if (! await shop.isValid(s)) {
            let err = new Error('Not a valid shop')
            err.name = 'ShopError'
            err.type = 'Invalid'
            throw err
        }

        if (s.status != 'inactive') {
            let err = new Error('Not permitted')
            err.name = 'PermissionError'
            err.type = 'Denied'
            throw err
        }

        //Retrieve all the shop's catalogs
        let sCatalogs = await catalog.read({ owner: String(s._id) })

        if (sCatalogs && (!Array.isArray(sCatalogs))) {
            sCatalogs = [sCatalogs]
        }
        
        //Retrieve all the shop's products
        let sProducts = await product.read({ shop: String(s._id) })

        if (sProducts && (!Array.isArray(sProducts))) {
            sProducts = [sProducts]
        }

        //Ensure all catalogs are removed prior to deletion
        for (const c of sCatalogs) {
            if (await catalog.isValid(c)) {
                if (c.status != 'inactive') {
                    let activeCatalogErr = new Error('Not permitted to delete shop with active product catalogs')
                    activeCatalogErr.name = 'PermissionError'
                    activeCatalogErr.type = 'ActiveCatalog'
                    throw activeCatalogErr
                } else {
                    if (debug) console.log('Deleting catalog ' + c.displayName + ' ' + String(c._id))
                    let catalogDeleteResult = await catalog.delete(c)
                    if (debug) console.log(catalogDeleteResult)
                }

            }
        }

        //Ensure all products are withdrawn from market prior to attempting deletion
        for (const p of sProducts) {
            if (await product.isValid(p)) {
                if (p.status != 'inactive') {
                    let activeProductErr = new Error('Not permitted to delete shop with active products')
                    activeProductErr.name = 'PermissionError'
                    activeProductErr.type = 'ActiveProduct'
                    throw activeProductErr
                } else {
                    if (debug) console.log('Deleting product ' + p.displayName + ' ' + String(p._id))
                    let productDeleteResult = await product.delete({ name: p.name, shop: String(s._id) })
                    if (debug) console.log(productDeleteResult)
                }

            }
        }

        let result = await shop.delete({ _id: s._id })
        if(debug) console.log(result)
        if (debug) console.log('Shop ' + String(s._id) + 'deleted.')
    } catch (e) {
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
    p.price = generator.roundNumber( form.unit_dollar ? Number(form.unit_dollar + '.' + (form.unit_cents ? form.unit_cents : '00')): 0, 2)
    //p.currency = form.currency ? form.currency : 'jmd'

    let productCurrency = await currency.read(form.currency,{findBy: 'id'})

    if (!currency.isValid(productCurrency)) {
          let error = new Error('Invalid currency code')
          error.name = 'CurrencyError'
          error.type = 'InvalidCurrency'
          throw error
    }

    if(cfg.minimum_price && cfg.minimum_price_currency) {
        try {
            let minPrice = Number(cfg.minimum_price)
            let minCurCode = String(cfg.minimum_price_currency)

            let currencyExchangeRate = Number(productCurrency.exchangeRates[productCurrency.code])

            if (isNaN(currencyExchangeRate)) {
                console.error('Unable to do currency conversion for product: ')
                console.error(currencyExchangeRate)
                let eXError = new Error('Invalid exchange rate')
                eXError.name = 'CurrencyExchangeRateError'
                eXError.type = 'InvalidExchangeRate'
                throw eXError
            }

            let productPriceInBase = (1 * (p.price / currencyExchangeRate))
            let minPriceInBase = 1 * (minPrice / Number(productCurrency.exchangeRates[minCurCode]))

            if (!(productPriceInBase >= minPriceInBase)) {
                console.error('Product price lower than minimum allowed price')
                console.error(generator.roundNumber(productPriceInBase,2) + ' ' + productCurrency.exchangeBase)
                console.error('Minimum allowed price: ')
                console.error(generator.roundNumber(minPriceInBase,2) + ' ' + productCurrency.exchangeBase)
                let minPriceError = new Error('Below minimum')
                minPriceError.name = 'PricingError'
                minPriceError.type = 'InvalidPrice'
                throw minPriceError
           }
        } catch (e) {
            throw e
        }
    }

    p.currency = productCurrency._id.toString()
    if (form.name !== 'undefined'){
      p.displayName = form.name

    }
    
    let pImgs = []
    p.images = pImgs

    let specs = {}
    for (key in form){
      if (!key.startsWith('spec_')) continue
      specs[key.replace('spec_', '')] = form[key]
    }
    p.specifications = specs
    let result = await product.create(p)

    let newProd = await product.read(p,{ limit: 1 })

    if (result && await product.isValid(newProd)) {
        // Save product images
        let pImgs = []
        if (files && Array.isArray(files) && files.length > 0) {
            for (x of files) {
                let img = {}
                x.storage = cfg.media_datastore ? cfg.media_datastore : 'db'
                if (x.storage != 'db') {
                    img = await media.write(x, (cfg.media_dest_products ? cfg.media_dest_products : '/product') + '/' + String(newProd._id) + '/' + (x.originalname ? x.originalname : generator.uuid()))
                } else {
                    img = x
                }
                pImgs.push(img)
            }
        }
        if (debug) console.log('Saving new product images')
        let productImageSaveResult = await product.update(newProd, { images: pImgs })
        if (debug) console.error(productImageSaveResult)
        return productImageSaveResult
    } else {
        if(debug) console.error(result)
        return false
    }
  } catch (e) {
      console.log('Error during product add operation. Passing error up the stack')
      console.error(e)
      throw e
  }
}


module.exports = shophandler

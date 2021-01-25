const cfg = require('../../configuration')
const user = require('../../models/user')
const shop = require('../../models/shop')
const product = require('../../models/product')
const warehouse = require('../../models/warehouse')
const generator = require('../../utilities/generator')
const media = require('../../adapters/storage/media')
const debug = cfg.env == 'development' ? true : false
const catalog = require('../../models/catalog')
const currency = require('../../models/currency')
const fx = require('../../models/fx')
const validator = require('../../utilities/validator')
/*
let getField = generator.getField

let getPrimaryField = generator.getPrimaryField

let removePrimaryFields = generator.removePrimaryFields

let removeFields = generator.removeFields

let removeAddressFields = generator.removeAddressFields
*/
let adminhandler = {}

adminhandler.populateViewData = async (uid, status = 'active', warehouse_page = 1, role_page = 1, permission_page = 1) => {
    return new Promise(async (resolve, reject) => {
        // validator function to check if uid has role super-admin
        t = { owner: uid } // possible remove
        let perPage = cfg.items_per_page ? cfg.items_per_page : 12
        pagination = true
        o_warehouse = null
        console.log('Page: ' + warehouse_page)
        if (pagination) {
          o_warehouse = { pagination_skip: warehouse_page, pagination_limit: perPage}
        }

        console.log('Populating view for admin: ' + uid)
        console.log(t)
        console.log(o_warehouse)
        try {
            let u = await user.read(uid, { findBy: 'id' })
            let w = await warehouse.read({limit: 10, status: 'active'})
            // let r = await role.read({limit:10, status: 'active'})
            // let p = await permission.read({limit:10, status: 'active'})
            let viewData = {}
            // details for checks needed on admin Page
            viewData.roles = u.roles

            resolve(viewData)
        } catch (e) {
            reject(e)
        }
    })
}

adminhandler.warehouseAddHandler = async (form, files) => {
  try {
    let s = {}
    // Read existing stored user details
    //const usr = await user.read(form.uid, { findBy: 'id' })
    const usr = await user.read({preferredUsername: form.owner}, { limit: 1 })
    console.log(usr)
    console.log(usr._id)
    console.log(typeof usr._id)
    console.log(usr._id.valueOf())
    console.log(usr._id.getTimestamp())
    console.log(usr._id.toString())
    //console.log(str(usr._id))
    //s.owner = form.owner
    s.owner = usr._id.toString()
    s.name = form.fullname
    s.displayName = form.fullname
    s.status = 'active'
    s.images = []
    //s.staff = {usr._id.toString(): 'admin' }
    let st = {}
    st[usr._id.toString()] = 'admin'
    s.staff = st

    /*
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

    //Validate email
    if (validator.isNotNull(form.email) && validator.isEmailAddress(form.email)) {
        let primaryEmail = {
            value: form.email,
            primary: true
        }
        s.emails = [primaryEmail]
    }
    */

    if (debug) {
      console.log('Attempting to create new warehouse...')
      console.log(s)
    }
    let createResult = await warehouse.create(s)
    if (debug) console.log(createResult)
    let newWarehouse = await warehouse.read(s, { limit: 1 })
    //let newWarehouse = await warehouse.read({_id: createResult.insertedId.toString()}, { limit: 1 })
    if (debug) console.log(newWarehouse)
    let temp_v = await warehouse.isValid(newWarehouse)
    console.log(temp_v)
    if (createResult && newWarehouse && (await warehouse.isValid(newWarehouse))) {
        // Save warehouse images
        let sImgs = []
        console.log(files)
        if (files && Array.isArray(files)) {
            for (x of files) {
                let img = {}
                x.storage = cfg.media_datastore ? cfg.media_datastore : 'db'
                if (x.storage != 'db') {
                    img = await media.write(x, (cfg.media_dest_shops ? cfg.media_dest_shops : '/warehouse') + '/' + String(newWarehouse._id) + '/' + (x.originalname ? x.originalname : generator.uuid()))
                } else {
                    img = x
                }
                sImgs.push(img)
            }
        }
        if (debug) {
          console.log('Saving new warehouse images...')
          console.log(sImgs)
        }
        let warehouseImageSaveResult = await warehouse.update(newWarehouse, {images: sImgs})
        //let warehouseImageSaveResult = await warehouse.update(createResult.insertedId ,{findBy: '_id'}, {images: sImgs})
        if (debug) {
          console.error(warehouseImageSaveResult)
          console.log(createResult)
        }
        //if
        //return warehouseImageSaveResult
        return createResult
    } else {
        if(debug) {
          console.log("Warehouse Creation Result Details:")
          console.log(createResult)
          console.log(newWarehouse)
        }
        return false
    }
  } catch (e) {
      console.log("Controller/Handler/Admin Error:")
      console.error(e)
      throw e
  }
}

adminhandler.warehouseClose = async (w) => {
    try {
        if(! await warehouse.isValid(w)) {
            let err = new Error('Not a valid warehouse')
            err.name = 'WarehouseError'
            err.type = 'Invalid'
            throw err
        }

        let result = await warehouse.update({ _id: w._id }, { status: 'inactive' })
        if (debug) console.log(result)

        /*
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
        */
        if (debug) console.log('Warehouse: ' + String(w._id) + ' status \'inactive\'.')
    } catch (e) {
        throw e
    }
}

adminhandler.warehouseDelete = async (w) => {
    try {
        if (! await warehouse.isValid(w)) {
            let err = new Error('Not a valid warehouse')
            err.name = 'WarehouseError'
            err.type = 'Invalid'
            throw err
        }

        if (w.status != 'inactive') {
            let err = new Error('Not permitted')
            err.name = 'PermissionError'
            err.type = 'Denied'
            throw err
        }
        /*
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
        */
        let result = await warehouse.delete({ _id: w._id })
        if(debug) console.log(result)
        if (debug) console.log('Warehouse ' + String(w._id) + 'deleted.')
    } catch (e) {
        throw e
    }
}



module.exports = adminhandler

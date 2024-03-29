const cfg = require('../../configuration')
const validator = require('../../utilities/validator')
const user = require('../../models/user')
const shopHandler = require('../handlers/shop')
const generator = require('../../utilities/generator')
const shop = require('../../models/shop')
const warehouse = require('../../models/warehouse')
const parcel = require('../../models/parcel')
const currency = require('../../models/currency')
const validaor = require('../../utilities/validator')
const debug = cfg.env == 'development' ? true : false

let getField = generator.getField

let getPrimaryField = generator.getPrimaryField

let removePrimaryFields = generator.removePrimaryFields

let removeFields = generator.removeFields

let removeAddressFields = generator.removeAddressFields

let accounthandler = {}

accounthandler.populateViewData = async (uid) => {
    return new Promise(async (resolve, reject) => {
        try {
            let u = await user.read(uid, { findBy: 'id' })
            let viewData = {}
            viewData.addresses = u.addresses
            let primaryAddr = generator.getPrimaryField(viewData.addresses)
            if (primaryAddr) {
                viewData.addressStreet = { value: primaryAddr.streetAddress }
                viewData.secondAddressStreet = { value: primaryAddr.secondStreetAddress }
                viewData.addressLocality = { value: primaryAddr.locality }
                viewData.addressRegion = { value: primaryAddr.region }
                viewData.addressPostcode = { value: primaryAddr.postalCode }
                viewData.addressCountry = { value: primaryAddr.country }
                viewData.addressType = { value: primaryAddr.type }
            }
            viewData.emails = u.emails
            viewData.phoneNumbers = u.phoneNumbers
            let phone = generator.getPrimaryField(viewData.phoneNumbers)
            if (phone) {
                viewData.phone ={
                    value: phone.value,
                    type: phone.type
                }
            }
            viewData.verifiedUser = u.verified

            //Populate the currency list
            viewData.currency_list = {}
            let c = await currency.read({ status: 'active' })
            if (c) {
              if (Array.isArray(c)) {
                for (let cIdx = 0; cIdx < c.length; cIdx++) {
                  if (currency.isValid(c[cIdx])) {
                    viewData.currency_list[c[cIdx]._id.toString()] = c[cIdx]
                  }
                }
              }
            }

            let whsPackageHandlers = await warehouse.read({generalPackageHandler: true})
            if(debug) {
              console.log('Found the following package handlers: ')
              console.log(whsPackageHandlers)
            }
            let packageHandlers = []

            if(Array.isArray(whsPackageHandlers)) {
              for(const w of whsPackageHandlers) {
                packageHandlers.push({handler: w._id, name: w.name})
              }
            }
            viewData.packageHandlers = packageHandlers
            if(debug) console.log(viewData.packageHandlers)

            let dForms = {
                security: false,
                contact: false,
                addresses: false,
                orders: false,
                payments: false,
                settings: false
            }

            // Disable security credentials update for external accounts
            if (!validator.isLocalUserAccount(u)) {
                dForms.security = true
            }
            viewData.disabledForms = dForms
            resolve(viewData)
        } catch (e) {
            reject(e)
        }
    })
}

accounthandler.populateUserViewData = async (uid) => {
  return new Promise(async (resolve, reject) => {
    try {
      let u = await user.read(uid, { findBy: 'id' })
      let viewData = {}
      viewData.addresses = u.addresses
      let primaryAddr = getPrimaryField(viewData.addresses)
      if (primaryAddr) {
        viewData.addressStreet = { value: primaryAddr.streetAddress }
        viewData.secondAddressStreet = { value: primaryAddr.secondStreetAddress }
        viewData.addressLocality = { value: primaryAddr.locality }
        viewData.addressRegion = { value: primaryAddr.region }
        viewData.addressPostcode = { value: primaryAddr.postalCode }
        viewData.addressCountry = { value: primaryAddr.country }
        viewData.addressType = { value: primaryAddr.type }
      }
      viewData.emails = u.emails
      viewData.phoneNumbers = u.phoneNumbers
      let phone = getPrimaryField(viewData.phoneNumbers)
      if (phone) {
        viewData.phone = {
          value: phone.value,
          type: phone.type
        }
      }
      viewData.verifiedUser = u.verified

      //Populate the currency list
      viewData.currency_list = {}
      let c = await currency.read({ status: 'active' })
      if (c) {
        if (Array.isArray(c)) {
          for (let cIdx = 0; cIdx < c.length; cIdx++) {
            if (currency.isValid(c[cIdx])) {
              viewData.currency_list[c[cIdx]._id.toString()] = c[cIdx]
            }
          }
        }
      }

      let whsPackageHandlers = await warehouse.read({ generalPackageHandler: true, status: 'active' })
      if (debug) {
        console.log('Found the following package handlers: ')
        console.log(whsPackageHandlers)
      }
      let packageHandlers = []

      if (Array.isArray(whsPackageHandlers)) {
        for (const w of whsPackageHandlers) {
          packageHandlers.push({ handler: w._id, name: w.name })
        }
      }
      viewData.packageHandlers = packageHandlers
      if(debug) console.log(viewData.packageHandlers)

      let dForms = {
        security: false,
        contact: false,
        addresses: false,
        orders: false,
        payments: false,
        settings: false
      }

      // Disable security credentials update for external accounts
      if (!validator.isLocalUserAccount(u)) {
        dForms.security = true
      }
      viewData.disabledForms = dForms
      resolve(viewData)
    } catch (e) {
      reject(e)
    }
  })
}

accounthandler.lsFormHandler = async (username, pass) => {
  try {
    return await user.update({ preferredUsername: username }, { password: pass })
  } catch (e) {
      console.error(e)
      throw e
  }
}

accounthandler.ciFormHandler = async (form) => {
  try {
    let u = {}
    // Read existing stored user details
    const usr = await user.read(form.uid, { findBy: 'id' })

    u.preferredUsername = usr.preferredUsername

    //Validate name
    if (validator.isNotNull(form.givenName) && validator.isNotNull(form.familyName)) {
      u.name = {
          givenName: String(form.givenName),
          familyName: String(form.familyName)
      }
    }

    //Validate phone
    if (validator.isNotNull(form.phone) && validator.isPhoneNumber(form.phone)) {

        usr.phoneNumbers ? u.phoneNumbers = usr.phoneNumbers : u.phoneNumbers = [];

        let primaryPhone  = {
            value: form.phone,
            type: form.phoneType || "other",
            primary: true
        }

        u.phoneNumbers = generator.removePrimaryFields(u.phoneNumbers)
        u.phoneNumbers.push(primaryPhone)

    }

    //Validate address
    if (validator.isNotNull(form.addressStreet) && validator.isNotNull(form.addressLocality) && validator.isNotNull(form.addressRegion) && validator.isNotNull(form.addressPostcode) && validator.isNotNull(form.addressCountry)) {

        usr.addresses ? u.addresses = usr.addresses : u.addresses = [];

        let primaryAddr = {
            type: form.addressType || "home",
            streetAddress: form.addressStreet,
            secondStreetAddress: form.secondAddressStreet,
            locality: form.addressLocality,
            region: form.addressRegion,
            postalCode: form.addressPostcode,
            country: form.addressCountry,
            formatted: generator.formattedAddress({
                streetAddress: form.addressStreet,
                secondStreetAddress: form.secondAddressStreet,
                locality: form.addressLocality,
                region: form.addressRegion,
                postalCode: form.addressPostcode,
                country: form.addressCountry}),
            primary: true
        }
        if(!primaryAddr.formatted) delete primaryAddr.formatted
        u.addresses = generator.removePrimaryFields(u.addresses)
        u.addresses.push(primaryAddr)

    }

    return await user.update({ preferredUsername: u.preferredUsername }, u)
  } catch (e) {
      console.error(e)
      throw e
  }
}

accounthandler.naFormHandler = async (form) => {
  try {
    let u = {}

    // Read existing stored user details
    const usr = await user.read(form.uid, { findBy: 'id' })

    u.preferredUsername = usr.preferredUsername

    //Validate address
    if (validator.isNotNull(form.addressStreet) && validator.isNotNull(form.addressLocality) && validator.isNotNull(form.addressRegion) && validator.isNotNull(form.addressPostcode) && validator.isNotNull(form.addressCountry)) {

        usr.addresses ? u.addresses = usr.addresses : u.addresses = [];

        let addr = {
            type: form.addressType || "home",
            streetAddress: form.addressStreet,
            secondStreetAddress: form.secondAddressStreet,
            locality: form.addressLocality,
            region: form.addressRegion,
            postalCode: form.addressPostcode,
            country: form.addressCountry,
            formatted: generator.formattedAddress({
                streetAddress: form.addressStreet,
                secondStreetAddress: form.secondAddressStreet,
                locality: form.addressLocality,
                region: form.addressRegion,
                postalCode: form.addressPostcode,
                country: form.addressCountry
            })
        }

        if (!addr.formatted) delete addr.formatted

        if (validator.isNotNull(form.setPrimary) && form.setPrimary == 'true') {
            addr.primary = true
            u.addresses = generator.removePrimaryFields(u.addresses)
        }

        // Add contact name to the address
        if(validator.isNotNull(form.fullname)) {
            let addrName = {formatted: form.fullname}
            addr.name = addrName
        }

        // Add phone number to the address
        if(validator.isPhoneNumber(form.phone)) {
            let phone = {value: form.phone}
            phone.type = form.phoneType || 'home'

            addr.phoneNumbers = [phone]
        }

        u.addresses.push(addr)

    }
    return user.update({ preferredUsername: u.preferredUsername }, u)
  } catch (e) {
      console.error(e)
      throw e
  }
}

accounthandler.addressUpdateHandler = async (form) => {
  try {
    let u = {}
    // Read existing stored user details
    const usr = await user.read(form.uid, { findBy: 'id' })

    u.preferredUsername = usr.preferredUsername
    switch(form.update) {
        case 'delete':
          u.addresses = removeAddressFields(usr.addresses, {
              streetAddress: form.streetAddress,
              secondStreetAddress: form.secondStreetAddress,
              locality: form.locality,
              region: form.region,
              postalCode: form.postalCode,
              country: form.country
          })
          if(!(u.addresses.length < usr.addresses.length)) {
              throw new Error('Unable to remove address')
          }
          return await user.update({ preferredUsername: u.preferredUsername }, u)
        case 'edit':
        default:
          return
        }
  } catch (e) {
      console.error(e)
      throw e
  }
}

accounthandler.emailAddHandler = async (form) => {
  try {
    let u = {}

    // Read existing stored user details
    const usr = await user.read(form.uid, { findBy: 'id' })

    u.preferredUsername = usr.preferredUsername

    //Validate email address
    if (validator.isEmailAddress(form.email)) {
        let hasEmailAlready = generator.getField(usr.emails, form.email)
        if (!hasEmailAlready) {
            u.emails = usr.emails
            u.emails ? u.emails.push({ value: form.email }) : u.emails = [{ value: form.email, primary: true }]
        }
    }
    return await user.update({ preferredUsername: u.preferredUsername }, u)
  } catch (e) {
      console.error(e)
      throw e
  }
}

accounthandler.emailDeleteHandler = async (form) => {
  try {
    let u = {}

    // Read existing stored user details
    const usr = await user.read(form.uid, { findBy: 'id' })

    u.preferredUsername = usr.preferredUsername

    u.emails = generator.removeFields(usr.emails, form.email)
    return await user.update({ preferredUsername: u.preferredUsername }, u)

  } catch (e) {
      console.error(e)
      throw e
  }
}

accounthandler.phoneAddHandler = async (form) => {
  try {
    let u = {}

    // Read existing stored user details
    const usr = await user.read(form.uid, { findBy: 'id' })

    u.preferredUsername = usr.preferredUsername

    //Validate phone number
    if (validator.isPhoneNumber(form.phoneNumber)) {
        let hasPhoneNumberAlready = generator.getField(usr.phoneNumbers, form.phoneNumber)
        if (!hasPhoneNumberAlready) {
            u.phoneNumbers = usr.phoneNumbers
            u.phoneNumbers ? u.phoneNumbers.push({ value: form.phoneNumber, type: form.phoneType }) : u.phoneNumbers = [{ value: form.phoneNumber, type: form.phoneType, primary: true }]

        }
    }
    return await user.update({ preferredUsername: u.preferredUsername }, u)
  } catch (e) {
      console.error(e)
      throw e
  }
}

accounthandler.phoneDeleteHandler = async (form) => {
  try {
    let u = {}

    // Read existing stored user details
    const usr = await user.read(form.uid, { findBy: 'id' })

    u.preferredUsername = usr.preferredUsername

    u.phoneNumbers = generator.removeFields(usr.phoneNumbers, form.phoneNumber)
    return await user.update({ preferredUsername: u.preferredUsername }, u)

  } catch (e) {
      console.error(e)
      throw e
  }
}

accounthandler.deliveryAlertHandler = async (form, files) => {
  try {

    // Read existing stored user details
    const usr = await user.read(form.uid, { findBy: 'id' })
    if (!await user.isValid(usr)) {
      let userError = new Error('Invalid user for delivery pre-alert')
      throw userError
    }

    // Read existing stored warehouse details
    const whs = await warehouse.read(form.pkgHandler, { findBy: 'id' })
    if (!await warehouse.isValid(whs)) {
      let warehouseError = new Error('Invalid warehouse for delivery pre-alert')
      throw warehouseError
    }

    let p = {}
    p.owner = form.uid
    p.warehouse = form.pkgHandler
    p.tracknum = form.tracknum
    p.serviceType = form.serviceType
    p.invoices = []
    p.description = form.description || ''
    if (validaor.isNotNull(form.courier)) p.courier = form.courier

    let pval_dollar = validator.isNotNull(form.unit_dollar) ? form.unit_dollar : 0
    let pval_cents = validator.isNotNull(form.unit_cents) ? form.unit_cents : 0

    p.declaredValue = generator.roundNumber(pval_dollar && pval_cents ? Number(pval_dollar + '.' + pval_cents) : 0, 2)

    if (validaor.isNotNull(form.currency)) {
      let c = await currency.read(form.currency, { findBy: 'id'})
      if (!currency.isValid(c)) {
        let currencyError = new Error('Invalid delivery pre-alert declared currency')
        throw currencyError
      } else {
        p.declaredValueCurrency = c.code
      }
    } else {
      p.declaredValueCurrency = cfg.base_currency_code
    }

    if(debug) {
      console.log('Attempting to create parcel: ')
      console.log(p)
    }

    let pkg = await parcel.create(p)

    if (await parcel.isValid(pkg)) {
      //Process uploaded invoices
      if (files && Array.isArray(files)) {
        if (files.length > 0) {
          let pkgInvs = pkg.invoices
          for (x of req.files) {
            let inv = {}
            inv = await media.write(x, (cfg.media_dest_parcels ? cfg.media_dest_parcels : '/parcel') + '/' + String(pkg._id) + '/delivery/invoice/' + (x.originalname ? x.originalname : generator.uuid()))
            inv.type = 'invoice'
            pkgInvs.push(inv)
          }
          pkg = await pkg.update({_id: pkg._id},{invoices: pkgInvs})
        }
      }
    }

    return pkg
  } catch (e) {
    console.error(e)
    throw e
  }
}

accounthandler.deleteHandler = async (uid) => {
  try {
    let shopsOwned = await shop.read({owner: uid})
    if(shopsOwned && (! Array.isArray(shopsOwned)) && await shop.isValid(shopsOwned)) {
      shopsOwned = [shopsOwned]
    } else if (shopsOwned && Array.isArray(shopsOwned)) {
      for(const s of shopsOwned) {
        if(await shop.isValid(s)) {
          let shopDeleteResult = await shopHandler.shopDelete(s)
          if(debug) {
            console.log(shopDeleteResult)
          }
        }
      }
    }
    
    let u = await user.read(uid,{findBy: 'id'})
    return await user.delete({preferredUsername: u.preferredUsername})
  } catch (e) {
      console.error(e)
      throw e
  }
}

module.exports = accounthandler

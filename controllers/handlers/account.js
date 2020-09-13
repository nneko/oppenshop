const cfg = require('../../configuration')
const validator = require('../../utilities/validator')
const user = require('../../models/user')
const bcrypt = require('bcryptjs')
const express = require('express')
const converter = require('../../utilities/converter')
const generator = require('../../utilities/generator')
const debug = cfg.env == 'development' ? true : false
//const passport = require('passport')

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

accounthandler.lsFormHandler = async (user, pass) => {
  try {
    return await user.update({ preferredUsername: user }, { password: pass })
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
            locality: form.addressLocality,
            region: form.addressRegion,
            postalCode: form.addressPostcode,
            country: form.addressCountry,
            formatted: generator.formattedAddress({
                streetAddress: form.addressStreet,
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
            locality: form.addressLocality,
            region: form.addressRegion,
            postalCode: form.addressPostcode,
            country: form.addressCountry,
            formatted: generator.formattedAddress({
                streetAddress: form.addressStreet,
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

accounthandler.deleteHandler = async (uid) => {
  try {
    let u = await user.read(uid,{findBy: 'id'})
    return await user.delete({preferredUsername: u.preferredUsername})
  } catch (e) {
      console.error(e)
      throw e
  }
}

module.exports = accounthandler

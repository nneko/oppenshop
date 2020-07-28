const cfg = require('../../configuration')
const express = require('express')
const mailer = require('../../adapters/messaging/mailer')

let resetpassword = express.Router()

let props = {
    title: cfg.title,
    theme: cfg.template
}

let resetEmailer = {}

resetEmailer.password_reset = async _data => {
    try {
        let data = {}
        data.subject = 'Oppenshop - Password Rest'
        let url = cfg.endpoint + 'reset?'
        data.text = 'Good Day ' + _data.name + ',\n Please select the link below to reset your password:\n.\n\nBest Regards,\nAdmin'
        data.to = _data.email
        await mailer.send(data)
    } catch (e) {
        console.error(e)
    }
}

resetpassword.get('/', (req, res) => {
    res.render('signin', props)
})

module.exports = resetpassword

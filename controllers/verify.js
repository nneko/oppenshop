const cfg = require('../configuration/index.js')
const express = require('express')
const mailer = require('../adapters/messaging/mailer.js')

let verify = express.Router()

let props = {
    title: cfg.title,
    theme: cfg.template
}

let signupEmailer = {}


signupEmailer.sendWelcome = async _data => {
    try {
        let data = {}
        data.subject = 'OppenShop - Welcome'
        data.text = 'Welcome ' + _data.name + ',\nOppenshop is local platform marketplace to view, shop and pay for locally.\n\nBest Regards,\nAdmin'
        data.html = 'Welcome </b>' + _data.name + '</b>,<br>Oppenshop is local platform marketplace to view, shop and pay for locally.<br><br>Best Regards,<br>Admin'
        data.to = _data.email
        await mailer.send(data)
    } catch (e) {
        console.error(e)
    }
}

let validate = async data => {
    let decoded_data = jwt.verify(data, cfg.accessTokenSecret);
    // TODO: Call to check if details in DB and add flag verified, return true or false 
    return true
}

verify.get('/', (req, res) => {
    res.render('index', props)
})

module.exports = verify

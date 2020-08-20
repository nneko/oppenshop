const cfg = require('../../configuration')
const express = require('express')
const mailer = require('../../adapters/messaging/mailer')


let resetpassword = express.Router()

let resetEmailer = {}

//resetEmailer.password_reset = async _data => {
resetpassword.password_reset = async _data => {
    try {
        let data = {}
        data.subject = 'Oppenshop - Password Rest'
        //let url = cfg.endpoint + 'reset?'
	let url = cfg.endpoint + 'signin'
        data.text = 'Good Day ' + _data.name + ',\n Below is your new password to login:\n\n'+ _data.temp +'\n\nYou may attempt login with the new details here:\n'+url+'\n\nBest Regards,\nAdmin'
        data.html = 'Good Day <b>' + _data.name + '</b>,<br> Below is your new password to login:<br>'+ _data.temp +'<br><br>You may attempt login with the new details <a href="'+url+'">here</a>.<br> Best Regards,<br>Admin' 
	data.to = _data.email
        await mailer.send(data)
    } catch (e) {
        console.error(e)
    }
}

resetpassword.get('/', (req, res) => {
    res.render('signin')
})

module.exports = resetpassword

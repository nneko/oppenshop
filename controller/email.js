const cfg = require('../configure.js')
const express = require('express')
const debug = cfg.env == 'development' ? true : false
const jwt = require('jsonwebtoken')

var mailgun = require('mailgun-js')({apiKey: cfg.mailgunPassword, domain: cfg.mailgunDomain})
 
var data = {
  from: 'Oppenshop <no-reply@oppenshop.com>',
  to: 'admin@oppenshop.com',
  subject: 'Hello',
  text: 'Testing some Mailgun awesomeness!'
}


//mailgun.messages().send(data, function (error, body) {
//  console.log(body)
//})

exports.welcome = async _data => {
	data.subject = 'Oppenshop - Welcome'
	data.text = 'Welcome '+_data.name+',\nOppenshop is local platform marketplace to view, shop and pay for locally.\n\nBest Regards,\nAdmin'
	data.html = 'Welcome </b>'+_data.name+'</b>,<br>Oppenshop is local platform marketplace to view, shop and pay for locally.<br><br>Best Regards,<br>Admin'
	data.to = _data.email	
	mailgun.messages().send(data, function (error, body) {
		console.log(body)
	})
}

exports.verify = async _data => {
	data.subject = 'Oppenshop - Email Verification'
	var token = jwt.sign({ email: _data.email }, cfg.accessTokenSecret)
	console.log(token)
	var url = cfg.endpoint +'email-verify?t='+token
	console.log(url)
        data.text = 'Good Day '+_data.name+',\n Please select the link below to verify your email address:\n'+url+'\n\nBest Regards,\nAdmin'
        data.html = 'Good Day <b>'+_data.name+'</b>,<br> Please select the link below to verify your email address:<br><a href="'+url+'">Email Verify Link</a><br><br>Best Regards,<br>Admin'
	data.to = _data.email
        console.log(_data)
        console.log(data)
        mailgun.messages().send(data, function (error, body) {
                if (error) console.log(error)
		console.log(body)
        })
}
exports.verify_email = async _data => {
	console.log(_data)
	var decoded = jwt.verify(_data.t, cfg.accessTokenSecret);
	console.log(decoded.email)
	// TODO: Call to check if details in DB and add flag verified, return true or false 
	return true
}
exports.password_reset = async _data => {
        data.subject = 'Oppenshop - Password Rest'
	var url = cfg.endpoint +'reset?'
        data.text = 'Good Day '+_data.name+',\n Please select the link below to reset your password:\n.\n\nBest Regards,\nAdmin'
        data.to = _data.email
        console.log(_data)
        console.log(data)
        mailgun.messages().send(data, function (error, body) {
                console.log(body)
        })
}

exports.notify = async _data => {

}

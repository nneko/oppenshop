const cfg = require('../../configuration')
const jwt = require('jsonwebtoken')
const validator = require('../../utilities/validator')

let mailer = {}

let mailgun = require('mailgun-js')({ apiKey: cfg.mailRelayPassword, domain: cfg.mailDomain})

let sender = cfg.mailSender

//mailgun.messages().send(data, function (error, body) {
//  console.log(body)
//})
mailer.send = async data => {
	try {
		if (validator.isNotNull(data.to) && validator.isNotNull(data.subject) && (validator.isNotNull(data.text) || validator.isNotNull(data.html))) {
			//Validate the destination address
			if(!validator.isEmailAddress(data.to)) throw new Error('Invalid destination')

			//Check if from field is set otherwise use default sender address from configuration
			if(!validator.isNotNull(data.from)) data.from = sender

			// Throw error if invalid entry for from field
			if(!validator.isEmailAddress(data.from)) throw new Error('Invalid sender address')

			//Send email message
			await mailgun.messages().send(data, function (error, body) {
				console.log(body)
				//return body
			})
		} else {
			throw new Error('Invalid message headers')
		}
	} catch (e) {
		console.error(e)
	}
}

module.exports = mailer

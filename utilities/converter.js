/*
 * Converts objects to different types
 *
 */
const fx = require('money')
const request = require('request')
const cfg = require('../configuration')
let converter = {}

fx.base = "JMD"
fx.rates = {
	"EUR" : 0.0061, // eg. 1 USD === 0.745101 EUR
	"GBP" : 0.0055, // etc...
	"CAD" : 0.0094,
	"JMD" : 1,        // always include the base rate (1:1)
  "USD" : 0.0071,
	/* etc */
}

converter.objectFieldsToString = (obj) => {
    let o = {}
    for(const k of Object.keys(obj)){
        let new_key = String(k).trim()

        //Replace unsupported characters (mongodb driver does not support keys starting with $ or keys containing '.')
        new_key = new_key.split('.').join('')

        if(new_key.startsWith('$')) {
            new_key = new_key.substr(1, new_key.length)
        }

        o[new_key] = String(obj[k]).trim()
    }

    return o
}
converter.currencyAmount = async function(source, dest_currency) {
  await pull_live_currency_rates()
  return {currency: dest_currency, amount: Number(fx.convert(source.amount,{from:source.currency ,to:dest_currency}).toFixed(2))}
}

let pull_live_currency_rates = async () => {
  // http://openexchangerates.github.io/money.js/
  request('https://openexchangerates.org/api/latest.json?app_id='+cfg.openExchangeRatesAppID, function (error, response, body) {
    if (error){
      return
    }
    fx.rates = body.rates
    fx.base = body.base
    //console.log(body)
    return

  })
}

module.exports = converter

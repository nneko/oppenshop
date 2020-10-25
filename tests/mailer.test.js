const mailer = require('../adapters/messaging/mailer.js')
const cfg = require('../configuration')
const jwt = require('jsonwebtoken')
const ejs = require('ejs')
const generator = require('../utilities/generator')
const path = require('path')

let d = {
    subject: 'OppenShop ...',
    to: 'unknown@unknown.com',
    name: 'John Brown',
    url: '',
    text: 'active',
    html: '<b>active</b>'
    //html: '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"></head><body></body></html>'
    //html: '<head><meta charset="utf-8"></head>'
    //html: '<!DOCTYPE html><html><head></head><body><b>active</b></body></html>'
}

let options = {
  /*root: '/Users/jaemarmiller/Documents/GitHub/oppenshop/',
  views: [
    '/Users/jaemarmiller/Documents/GitHub/oppenshop/'
  ],*/
  async: true
}

describe('mailer object returns object', () => {
  it('sending of verification email', async () => {
    //
    let item = {message: 'Queued. Thank you.'}
    let token = jwt.sign({ email: d.to, token: generator.randomString(32) }, cfg.accessTokenSecret)
    d.url = cfg.endpoint + 'verify?data=' + token
    d.subject = 'OppenShop - Email Verification'
    //d.html = await ejs.renderFile('/Users/jaemarmiller/Documents/GitHub/oppenshop/views/email_templates/welcome.ejs', d, {async: true})
    //d.html = await ejs.renderFile('views/email_templates/verify.ejs', d, options)
    var p1 = Promise.resolve(ejs.renderFile(path.resolve(__dirname, '../views/email_templates/verify.ejs'), d, options))
    p1.then(function(v1) {
      //console.log(v1)
      d.html = v1
      //console.log(d.html)
      var p2 = Promise.resolve(mailer.send(d))
      p2.then(function(v2) {
        console.log(v2)
        const data = v2
        console.log(data)
        expect(data).toEqual(expect.objectContaining(item))
      })
    })
  })

  it('sending of welcome email', async () => {
    //
    //
    let item = {message: 'Queued. Thank you.'}
    d.subject = 'OppenShop - Welcome'
    d.url = cfg.endpoint
    d.html = await ejs.renderFile(path.resolve(__dirname, '../views/email_templates/welcome.ejs'), d, options)
    const data = await mailer.send(d)
    console.log(data)
    expect(data).toEqual(expect.objectContaining(item))
  })

  it('sending of order email(user)', async () => {
    //
    //
    let item = {message: 'Queued. Thank you.'}
    d.subject = 'OppenShop - Order Placed'
    d.items = [{name: 'Item1'},{name: 'Item2'}]
    d.total_amount = 2
    d.total_currency = 'JMD'
    d.html = await ejs.renderFile(path.resolve(__dirname, '../views/email_templates/order_placed_user.ejs'), d, options)
    const data = await mailer.send(d)
    console.log(data)
    expect(data).toEqual(expect.objectContaining(item))
  })
  it('sending of order email(vendor)', async () => {
    //
    //
    let item = {message: 'Queued. Thank you.'}
    d.subject = 'OppenShop - Order Placed'
    d.items = [{name: 'Item1'},{name: 'Item2'}]
    d.total_amount = 2
    d.total_currency = 'JMD'
    d.html = await ejs.renderFile(path.resolve(__dirname, '../views/email_templates/order_placed_vendor.ejs'), d, options)
    const data = await mailer.send(d)
    console.log(data)
    expect(data).toEqual(expect.objectContaining(item))
  })
})

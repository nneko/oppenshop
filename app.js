const cfg = require('./configure.js')
const express = require('express')
const app = express()
const path = require('path')
const ejsLayouts = require('express-ejs-layouts')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')

module.exports = app

//Setup the app's global property variables
app.locals.template = cfg.template
app.locals.title = cfg.title
app.locals.port = cfg.port
app.locals.env = cfg.env

//Configure the app server
app.set('x-powered-by', false)
app.set('env', app.locals.env)
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '/view/' + app.locals.template))
app.set('layout', path.join(__dirname, '/view/' + app.locals.template+ '/layout'))
app.use(ejsLayouts)
app.use(flash())
app.use(session({
    secret: cfg.secret,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(require('./controller'))

//Start the server if there is no parent module
if(!module.parent){
    app.listen(app.locals.port, () => {
        console.log('\x1b[32m%s\x1b[0m', `oppenshop app started on port: ${app.locals.port}`)
    })
}
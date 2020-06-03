const cfg = require('./configure.js')
const express = require('express')
const app = express()
const path = require('path')
const ejsLayouts = require('express-ejs-layouts')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const db = require('./adapter/datastore')
const debug = cfg.env == 'development' ? true : false

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
    db.connect().then((result) => {
        const server = app.listen(app.locals.port, () => {
            console.log('\x1b[32m%s\x1b[0m', `OppenShop app started on port: ${app.locals.port}`)
        })
        const exit = () => {
            if (debug) {
                console.log('Shutting down...')
            }
            server.close(async () => {
                if (debug) {
                    console.log('Stopped accepting incoming requests.')
                    console.log('Closing database connections.')
                }
                await db.close()
                if(debug) console.log('Exiting.')
                process.exit(0)
            })
        }
        process.on('SIGINT', exit)
        process.on('SIGTERM', exit)
    }).catch (e => {
        if(debug) {
            console.log('Startup was unsuccessful. Shutting down...')
            console.log('Exiting due to error: ')
            console.log(e)
        }
        process.exit(-1)
    })
}
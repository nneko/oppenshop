const cfg = require('./configure.js')
const express = require('express')
const app = express()
const path = require('path')
const ejsLayouts = require('express-ejs-layouts')
const passport = require('passport')
const authLocal = require('./adapter/authentication/local')
const authToken = require('./adapter/authorization/jwt')
const flash = require('express-flash')
const session = require('express-session')
const secretKey = cfg.secret
const db = require('./adapter/storage/'+cfg.dbAdapter)
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
    cookie: {
        httpOnly: false
    },
    secret: secretKey,
    resave: false,
    saveUninitialized: false
}))
authLocal.init(passport, require('./model/user'))
authToken.init()
app.use(passport.initialize())
app.use(passport.session())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(require('./controller'))

//Catch-all error handler
app.use((err, req, res, next) => {
    let statusCode = err.status ? err.status : err.statusCode ? err.statusCode : 500
    let message = 'Error'
    switch (statusCode) {
        case 400:
            message = 'Bad Request'
            console.log(err.stack)
            break
        case 401:
            message = 'Unauthorized'
            break
        case 403:
            message = 'Forbidden'
            break
        case 404:
            message = 'Not Found'
            break
        case 405:
            message = 'Method Not Allowed'
            break
        case 500:
            message = 'Internal Server Error'
            console.log(err.stack)
            break
        default: 
            console.log(err.stack)
            break
    }
    res.status(statusCode)

    if(req.accepts('html')) {
        res.render('error', { error: { status: statusCode, message: message } })
        return
    }

    if(req.accepts('json')) {
        res.json({ error: { status: statusCode, message: message }, template_errorpage: 'error' })
        return
    }

    // default to plain-text. send()
    res.type('txt').send(message)
})

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
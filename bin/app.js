const path = require('path')
const logger = require('morgan')
const http = require('http')

const express = require('express')
const ejsLayouts = require('express-ejs-layouts')
const passport = require('passport')
const authLocal = require('../adapters/authentication/local')
const authToken = require('../adapters/authorization/jwt')
const flash = require('express-flash')
const session = require('express-session')
const sessionStore = require('connect-mongo')(session)

const cfg = require('../configuration')
const secretKey = cfg.secret

const db = require('../adapters/storage/' + cfg.dbAdapter)

//const debug = cfg.env == 'development' ? true : false
const debug = require('debug')('oppenshop:app')

const validator = require('../utilities/validator.js')

const app = express()

module.exports = app

/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(cfg.port || process.env.PORT || '3000')
app.set('port', port)

/**
 * Create HTTP server.
 */
let server = http.createServer(app)

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
    let port = parseInt(val, 10)

    if (isNaN(port)) {
        // named pipe
        return val
    }

    if (port >= 0) {
        // port number
        return port
    }

    return false
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
    if (error.syscall !== 'listen') {
        throw error
    }

    let bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges')
            process.exit(1)
            break
        case 'EADDRINUSE':
            console.error(bind + ' is already in use')
            process.exit(1)
            break
        default:
            throw error
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
    let addr = server.address()
    let bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    if (debug) {
        console.log('\x1b[32m%s\x1b[0m', 'Listening on ' + bind)
    }
    debug('\x1b[32m%s\x1b[0m', 'Listening on ' + bind)
}

//Start the server if there is no parent module
if(!module.parent){
    db.connect().then((result) => {
        //Setup the app's global property variables
        app.locals.template = cfg.template
        app.locals.title = cfg.title
        app.locals.port = cfg.port
        app.locals.env = cfg.env

        //Configure the app server
        app.set('x-powered-by', false)
        app.set('env', app.locals.env)
        app.set('view engine', 'ejs')
        app.set('views', path.join(__dirname, '../views/' + app.locals.template))
        app.set('layout', path.join(__dirname, '../views/' + app.locals.template + '/layout'))
        app.use(logger('dev'))
        app.use(ejsLayouts)
        app.use(session({
            cookie: {
                httpOnly: true,
                path: '/',
                maxAge: validator.isNotNull(cfg.sessionTTL) ? cfg.sessionTTL : 60 * 60 * 1000

            },
            name: 'session.sid',
            secret: secretKey,
            store: new sessionStore({
                client: db.getDriverClient(),
                dbName: db.getName(),
                collection: 'session',
                secret: secretKey,
                ttl: 1209600
            }),
            resave: false,
            saveUninitialized: false
        }))
        app.use(flash())
        authLocal.init(passport, require('../models/user'))
        authToken.init()
        app.use(passport.initialize())
        app.use(passport.session())
        app.use(express.json())
        app.use(express.urlencoded({ extended: true }))
        
        //app routes
        app.use(require('../controllers'))

        //Catch-all error handler
        app.use((err, req, res, next) => {
            // set locals, only providing error in development
            res.locals.message = err.message;
            res.locals.error = req.app.get('env') === 'development' ? err : {};
            let statusCode = err.status || 500
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

            if (req.accepts('html')) {
                let name = undefined
                let user = undefined
                if (validator.isNotNull(req.user)) {
                    user = req.user
                    if (validator.isNotNull(req.user.name)) {
                        name = req.user.name.givenName
                    }
                }
                res.render('error', { error: { status: statusCode, message: message }, name: name, user: user })
                return
            }

            if (req.accepts('json')) {
                res.json({ error: { status: statusCode, message: message }, template_errorpage: 'error' })
                return
            }

            // default to plain-text. send()
            res.type('txt').send(message)
        })

        /**
         * Listen on provided port, on all network interfaces.
         */
        server.listen(port, () => {
            console.log('\x1b[32m%s\x1b[0m', `Oppenshop app starting...`)
        })
        server.on('error', onError)
        server.on('listening', onListening)
        const exit = () => {
            if (debug) {
                console.log('\x1b[32m%s\x1b[0m', 'Shutting down...')
            }
            server.close(async () => {
                if (debug) {
                    console.log('\x1b[32m%s\x1b[0m', 'Stopped accepting incoming requests.')
                    console.log('\x1b[32m%s\x1b[0m', 'Closing database connections.')
                }
                await db.close()
                if (debug) console.log('\x1b[32m%s\x1b[0m', 'Exiting.')
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

const cfg = require('../configuration/index.js')
const express = require('express')
const validator = require('../utilities/validator')
const handler = require('./handlers/market')
const shopsHandler = require('./handlers/market/shops')
const searchEngine = require('./handlers/search/finder')
const converter = require('../utilities/converter')
const product = require('../models/product')
const media = require('../adapters/storage/media')
const debug = cfg.env == 'development' ? true : false

let market = express.Router()

market.use('/seller*', require('./market/seller'))
market.use('/product*', require('./market/product'))
market.use('/page/:page', async function (req, res, next) {
    try {
        let page = req.params.page || 1
        let qd = req.query
        console.log(page)
        console.log(qd)
        let viewData = {}
        console.log('Page: ' + page)
        viewData = await handler.populateViewData(validator.isNotNull(req.user) ? req.user.id : null, product_page = parseInt(page))
        viewData.user = req.user
        res.render('market', viewData)
    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Error retrieving shop pagination data' }, name: '', user: req.user })

    }
})

market.use('/shops/page/:page', async function (req, res, next) {
    try {
        let page = req.params.page || 1
        let qd = req.query
        console.log(page)
        console.log(qd)
        let viewData = {}
        console.log('Page: ' + page)
        viewData = await handler.populateViewData(validator.isNotNull(req.user) ? req.user.id : null, product_page = parseInt(page))
        viewData.user = req.user
        res.render('market', viewData)
    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Error retrieving shop pagination data' }, name: '', user: req.user })

    }
})

market.get('/shops', async (req, res) => {
    try {
        let viewData = await shopsHandler.populateViewData(validator.isNotNull(req.user) ? req.user.id : null)
        viewData.user = req.user
        res.render('shops', viewData)

    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Error retrieving data' }, name: '', user: req.user })
    }
})

market.get('/', async (req, res) => {
    try {
        let viewData = await handler.populateViewData(validator.isNotNull(req.user) ? req.user.id : null)
        viewData.user = req.user
        res.render('market', viewData)
    } catch (e) {
        console.error(e)
        res.status(500)
        res.render('error', { error: { status: 500, message: 'Error retrieving data' }, name: '', user: req.user })
    }
})

market.post('/', async (req, res) => {
    if (validator.isNotNull(req.body) && req.body != {}) {
        try {
            let form = converter.objectFieldsToString(req.body)
            let queryString = form.find ? form.find : ''

            let qry = {
                bool: {
                    should: {
                        match: {name: queryString},
                        match: {displayName: queryString},
                        match: {description: queryString}
                    }
                }
            }

            let queryOptions = {}

            let searchResult = await searchEngine.query(qry, queryOptions)

            let itemsFound = []

            if(Array.isArray(searchResult.results)) {
                for(const r of searchResult.results) {
                    if(r && r.ref) {
                        let p = await product.read(r.ref,{findBy: 'id'})
                        if(await product.isValid(p)) {
                            let i = {
                                ref: r.ref,
                                name: p.name,
                                displayName: p.displayName,
                                description: p.description
                            }
                            if (p.images && Array.isArray(p.images) && p.images.length > 0) i.image = media.getBinaryDetails(p.images[0]) //TODO: replace by primary image rather than just first image in list
                            itemsFound.push(i)
                        }
                    }
                }
            }
            let viewData = await handler.populateViewData(validator.isNotNull(req.user) ? req.user.id : null)
            viewData.user = req.user
            viewData.searchResults = {
                query: form.find ? form.find : '',
                total: searchResult.total,
                results: itemsFound
            }
            viewData.messages = {info: 'Found ' + (typeof(searchResult.total) == 'number' ? searchResult.total : 0) + ' matches for ' + '"' + (viewData.searchResults.query != '' ? (viewData.searchResults.query && viewData.searchResults.query.length < 21 ? viewData.searchResults.query.slice(0,20) : viewData.searchResults.query.slice(0,20) + '...') : '') + '"' + '.'}
            res.render('market', viewData)
            
        } catch (e) {
            let status = 500
            let message = 'Request could not be fulfilled.'
            if(e.meta && e.meta.body && e.meta.body.error) console.error(e.meta.body.error)
            if (e.meta && e.meta.statusCode) {
                status = e.meta.statusCode
                message = 'Bad Request'
            }
            if (debug) {
                if (e.stack) {
                    console.error(e.stack)
                } else {
                    console.log(e)
                }
            }
            res.status(status)
            res.render('error', { error: { status: status, message: message }, name: '', user: req.user })
        }
    } else {
        res.redirect('/market')
    }
})

module.exports = market

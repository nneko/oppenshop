const cfg = require('../../configuration/index.js')
const express = require('express')
const validator = require('../../utilities/validator')
const idx = cfg.indexerAdapter ? require('../../adapters/indexer/' + cfg.indexerAdapter) : null
const productIdx = cfg.indexerProductIndex ? cfg.indexerProductIndex : 'products-index'
const debug = cfg.env == 'development' ? true : false


let find = express.Router()
find.use(express.json())
find.post('/', async (req, res) => {
    if (validator.isNotNull(req.body) && req.body != {}) {
        try {
            if(debug) {
                console.log('Processing request at endpoint /api/find' + req.url)
                console.log('request: ')
                console.log(req.body)
            }
            let qry = req.body.query ? req.body.query : {}
            let queryOptions = req.body.options ? req.body.options : {}

            if (debug) {
                console.log('Submitting query to indexer')
                console.log('query: ')
                console.log(qry)
                console.log('query options: ')
                console.log(queryOptions)
            }
            let searchResult = await idx.search(productIdx,qry,queryOptions)

            if(debug) {
                console.log('Response received from indexer')
                console.log('result: ')
                console.log(searchResult)
            }

            if(searchResult && searchResult.body && searchResult.body.hits && searchResult.body.hits.hits && Array.isArray(searchResult.body.hits.hits) && searchResult.body.hits.hits.length > 0) {
                let results = []
                for (const r of searchResult.body.hits.hits) {
                    if (r && validator.isNotNull(r["_source"])) results.push(r["_source"])
                }
                res.status(200)
                res.json({
                    status: 200,
                    results: results
                })
            } else {
                res.status(200)
                res.json({
                    status: 200,
                    results: []
                })
            }
        } catch (e) {
            if(debug) {
                console.log(e)
                if(e.stack) console.error(e.stack)
            }
            if(e.meta && e.meta.statusCode) {
                res.status(e.meta.statusCode)
                res.json({
                    error: {
                        message: 'Bad Request',
                        reason: 'invalid query.'
                    },
                    status: 400
                })
            } else {
                res.status(500)
                res.json({
                    error: {
                        message: 'Request could not be fulfilled',
                        reason: 'server unable to process request.'
                    },
                    status: 500
                })
            }
        }
    } else {
        res.status(400)
        res.json({
            error: {
                message: 'Bad Request',
                reason: 'request body required.'
            },
            status: 400
        })
    }
})

find.use((req, res) => {
    res.status(405)
    res.json({ 
        error: {
            message: 'Method Not Allowed',
            reason: 'unsupported HTTP Method.'
        },
        status: 405
    })
})

module.exports = find
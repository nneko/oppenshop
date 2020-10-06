const cfg = require('../../configuration/index.js')
const express = require('express')
const validator = require('../../utilities/validator')
const searchEngine = require('../handlers/search/finder')
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

            let searchResult = await searchEngine.query(qry,queryOptions)
            res.status(200)
            res.json({
                status: 200,
                total: searchResult.total ? searchResult.total : 0,
                results: searchResult.results ? searchResult.results : []
            })
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
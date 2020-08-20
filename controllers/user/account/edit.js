const cfg = require('../../configuration')
const validator = require('../../utilities/validator')
const user = require('../../models/user')
const express = require('express')
const converter = require('../../utilities/converter')
const generator = require('../../utilities/generator')
const debug = cfg.env == 'development' ? true : false
//const passport = require('passport')

let edit = express.Router()

module.exports = edit
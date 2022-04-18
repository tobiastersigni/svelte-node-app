// /school-lunch/backend/database/client.js

const knex = require('knex')

// determine the environment from the ENV VAR called `ENVIRONMENT`, or
// default to development
const environment = process.env.ENVIRONMENT || 'development'

// get the appropriate config for the given environment
const config = require('./database/knexfile.jsexfile.js')[environment]

// instantiate Knex with the config
const db = knex(config)

module.exports = db
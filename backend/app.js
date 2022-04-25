require('dotenv').config() // APPLY THE .env FILE TO SET SECRETS AS ENV VARS
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const cors = require('cors')
const authenticateJwt = require('./authenticate-jwt') // IMPORT THE JWT FUNCTION
const { passKnexSecured } = require('./database/dynamic-knex')

const indexRouter = require('./routes/index')
const usersRouter = require('./routes/users')
const lunchWeeksRouter = require('./routes/lunch-weeks')
const lunchWeeksPublicRouter = require('./routes/lunch-weeks-public')

const app = express()

app.use(cors())
app.options('*', cors())

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

const router = express.Router()

router.use('/', indexRouter)
router.use('/users', usersRouter)
router.use('/lunch-weeks', [authenticateJwt, passKnexSecured], lunchWeeksRouter)
router.use('/lunch-weeks-public', lunchWeeksPublicRouter)
app.use('/api', router)

module.exports = app
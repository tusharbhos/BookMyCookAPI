import express from 'express'
import dotenv from 'dotenv'
import morgan from 'morgan'
import cors from 'cors'
import fs from 'fs'
import connectDB from './config/dbConnect.js'
import bodyParser from 'body-parser'


// import all routes
import userRoute from './routes/userRoute.js'


import cookieParser from 'cookie-parser'
import { errorHandler, notFound } from './middleware/errorHandler.js'

let app = express()
dotenv.config()
let PORT = process.env.PORT || 3113

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())

// app logs in app.log file
app.use(morgan('dev', { stream: fs.createWriteStream('./app.log') }))

app.use('/api/v1', userRoute)

app.use(notFound)
app.use(errorHandler)

app.get('/health', (req, res) => {
    res.status(200).send("<h1>Health is OK</h1>")
})

app.listen(PORT, (err) => {
    console.log(`Port ${PORT} is running`);
    connectDB()
})
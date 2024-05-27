// All imports
import express from 'express'
import dotenv from 'dotenv'
import morgan from 'morgan'
import fs from 'fs'
import cors from 'cors'


// routes import here


dotenv.config()
let PORT = process.env.PORT || 3113
let app = express()

// log the app activity
app.use(morgan('common', { stream: fs.createWriteStream('./app.log') }))

// Cors
app.use(cors())

// Body Parser
app.use(express.json())
app.use(express.urlencoded({ extended: true }))


app.get('/health', async (req, res) => {
    res.send("<h1>Health is ok</h1>")
})

app.listen(PORT, (err) => {
    if (err) throw new Error(err)
    console.log(`Port ${PORT} is running`)
})
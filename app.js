import express from "express";
import { configDotenv } from "dotenv";
import morgan, { format } from "morgan";
import cookieParser from "cookie-parser";
import cors from 'cors'
import fs from 'fs'
import bodyParser from "body-parser";

// Import database connection
import { dbConnect } from "./configs/dbConnect";

// Import error handlers
import { errorHandler, notFound } from "./middlewares/errorHandler";

// import routes 
import { userRouter } from './routes/userRoutes'

let app = express()
configDotenv()
const PORT = process.env.PORT || 3113

// Cross Origin Resource Sharing
app.use(cors())

// Body Parser
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

// Cookie Parsing 
app.use(cookieParser())

// app logs in app.log file
app.use(morgan('dev', { stream: fs.createWriteStream('./app.log') }))

// use imported routes here
app.use('/api/v1/user', userRouter)

app.get('/health', async (req, res) => {
    res.send("<h1>Health Ok</h1>")
})

// error handling
app.use(notFound)
app.use(errorHandler)

// Route for health checkup

// Run server
app.listen(PORT, (err) => {
    if (err)
        console.log(err.message)
    console.log(`Server is running on ${PORT} port`)
})
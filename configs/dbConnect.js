import mongoose from "mongoose";
require('dotenv').config();

const dbURI = process.env.DB_URI

export const dbConnect = (mongoose.connect(dbURI).then((data) => {
    if (data) {
        console.log(`MongoDB connected to ${data.connection.host}`)
    }
    else {
        console.log(`Database failed to connect.`)
        setTimeout(dbConnect, 5000)
    }
}))

mongoose.connection.on('connected', () => {
    console.log(`Connection Successful to mongoose DB.`)
})

mongoose.connection.on('error', (err) => {
    console.log(err.message)
})

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose Connection disconnected .')
})

process.on('SIGINT', async () => {
    await mongoose.connection.close()
    process.exit(0)
})
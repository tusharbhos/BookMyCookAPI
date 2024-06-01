import jwt from 'jsonwebtoken'
import createError from 'http-errors'
import dotenv from 'dotenv'
dotenv.config()

export const isAuthenticated = (req, res, next) => {
    if (!req.headers['authorization']) return next(createError.Unauthorized())

    const authHeader = req.headers['authorization']
    const bearerToken = authHeader.split(' ')
    const token = bearerToken[1]

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
        if (err) {
            const message = err.name === 'JsonWebTokenError' ? 'Unauthorized' : err.message
            return next(createError.Unauthorized(message))
        }
        req.payload = payload
        next()
    })
}
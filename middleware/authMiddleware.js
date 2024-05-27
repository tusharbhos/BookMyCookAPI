import User from '../models/userModel'

import Jwt from 'jsonwebtoken'
import asyncHandler from 'express-async-handler'


export const authMiddleware = asyncHandler(async (req, res, next) => {
    let nameToken;
    if (req?.headers?.authorization?.startsWith('Bearer')) {
        nameToken = req.headers.authorization.split(" ")[1]

        try {
            if (nameToken) {
                const decoded = Jwt.verify(nameToken, process.env.JWT_SECRET_KEY)
                const user = await User.findById(decoded.id)
                req.user = user
                next()
            }
        } catch (error) {
            throw new Error('Not Authorized token expired, please login again')
        }
    } else {
        throw new Error('There is no token attached to header')
    }
})

export const isAdmin = asyncHandler(async (req, res, next) => {
    const { email } = req.user
    const adminUser = await User.findOne({ email })
    if (adminUser?.role === 'Admin') {
        next()
    } else {
        throw new Error('You are not admin')
    }

})
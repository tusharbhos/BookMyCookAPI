import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import crypto from 'crypto'
import uniqid from 'uniqid'
import { response } from "express";
import User from '../models/userModel'
import createError from 'http-errors'
import { registerSchema, loginSchema } from "../utils/joiValidationSchema";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwtHelper";
import { redis } from "../configs/redisConnect";

// User Registration
export const registerUser = asyncHandler(async (req, res, next) => {

    try {

        const result = await registerSchema.validateAsync(req.body)

        const userDoesExist = await User.findOne({ email: result.email, password: result.password, userName: result.userName })

        if (userDoesExist) throw createError.Conflict(`${result.email} is already been registered.`)

        const newUser = new User(result)
        const savedNewUser = await newUser.save()
        const accessToken = await signAccessToken(savedNewUser.id)
        const refreshToken = await signRefreshToken(savedNewUser.id)

        res.send({ accessToken, refreshToken })
    } catch (error) {
        if (error.isJoi === true) error.status = 422
        next(error)
    }
})

// User Login
export const loginUser = asyncHandler(async (req, res, next) => {
    try {

        const result = await loginSchema.validateAsync(req.body)

        const userExists = await User.findOne({
            userName: result.userName
        })

        if (!userExists) throw createError.NotFound('User not registered.')

        const isMatched = userExists.isValidPassword(result.password)

        if (!isMatched) throw createError.Unauthorized('Username/password not valid.')

        const accessToken = await signAccessToken(userExists.id)
        const refreshToken = await signRefreshToken(userExists.id)


        res.cookie("accessToken", accessToken);
        res.cookie("refreshToken", refreshToken);

        res.send({
            success: true,
            userExists,
            accessToken,
        });

    } catch (error) {
        if (error.isJoi === true) return next(createError.BadRequest("Invalid Username or Password."))
        next(error)
    }
})


// Refresh Token
export const refreshToken = asyncHandler(async (req, res, next) => {
    try {
        const { refreshToken } = req.body
        if (!refreshToken) throw createError.BadRequest()
        const userId = await verifyRefreshToken(refreshToken)

        const accessToken = await signAccessToken(userId)
        const refToken = await signRefreshToken(userId)
        res.send({ accessToken: accessToken, refreshToken: refToken })
    } catch (error) {
        next(error)
    }
})

// Logout
export const logoutUser = asyncHandler(async (req, res, next) => {
    try {
        const { refreshToken } = req.cookies
        if (!refreshToken) throw createError.BadRequest('You are not logged in.')
        const userId = await verifyRefreshToken(refreshToken)

        redis.del(userId, (err, value) => {
            if (err) {
                console.log(err.message)
                throw createError.InternalServerError()
            }

            res.cookie("accessToken", "", { maxAge: 1 });
            res.cookie("refreshToken", "", { maxAge: 1 });
            res.send({
                success: true,
                message: 'Logout Successful.'
            });
        })
    } catch (error) {
        next(error)
    }
})





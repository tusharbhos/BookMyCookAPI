import { generateToken } from "../config/jwtToken";
import { generateRefreshToken } from "../config/refreshToken";
import User from "../model/userModel";
import asyncHandler from "express-async-handler";
import { validateMongoDbId } from "../utils/validateMongoDbId"
import jwt from "jsonwebtoken";
import { sendEmail } from "./emailController";
import crypto from 'crypto'
import uniqid from 'uniqid'

// Register User
export const createUser = asyncHandler(async (req, res) => {

    const email = req.body.email;
    const findUser = await User.findOne({ email });

    if (!findUser) {
        // create new user
        const newUser = await User.create(req.body)
        res.json(newUser)
    } else {
        throw new Error('User Already Exists')
    }
})

// Login User
export const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body

    // check user exists or not
    const findUser = await User.findOne({ email })
    const checkPass = await findUser.isPasswordMatched(password)

    if (findUser && checkPass) {
        const refreshToken = await generateRefreshToken(findUser?._id)
        const updateUser = await User.findByIdAndUpdate(findUser?._id, {
            refreshToken: refreshToken
        }, { new: true })
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            maxAge: 22 * 60 * 60 * 1000,
        })
        res.status(200).json({
            _id: findUser?._id,
            firstName: findUser?.firstName,
            lastName: findUser?.lastName,
            email: findUser?.email,
            mobile: findUser?.mobile,
            token: generateToken(findUser?._id),
        })
    } else {
        throw new Error('Invalid Credentials')
    }
})

// Get Users
export const getAllUsers = asyncHandler(async (req, res) => {
    try {
        const getUsers = await User.find({})
        res.status(200).json(getUsers)
    } catch (error) {
        throw new Error(error)
    }
})

// Get Single User
export const getUser = asyncHandler(async (req, res) => {
    const { id } = req.params
    validateMongoDbId(id)
    try {
        const getUser = await User.findById(id)
        res.status(200).json(getUser)
    } catch (error) {
        throw new Error(error)
    }

})

// Delete Single User
export const deleteUser = asyncHandler(async (req, res) => {
    const { _id } = req.params
    validateMongoDbId(_id)
    try {
        const deleteUser = await User.findByIdAndDelete(_id)
        res.status(200).json({
            message: `${deleteUser.firstName} Your Account Deleted`
        })
    } catch (error) {
        throw new Error(error)
    }

})

// Update User
export const updateUser = asyncHandler(async (req, res) => {
    const { _id } = req.user
    validateMongoDbId(_id)
    try {
        const updateUser = await User.findByIdAndUpdate(_id, {
            firstName: req?.body.firstName,
            lastName: req?.body.lastName,
            mobile: req?.body.mobile,
            email: req?.body.email,
            role: req?.body.role
        }, {
            new: true
        })

        res.status(200).json({
            message: `${updateUser.firstName} Your Account Updated`
        })
    } catch (error) {
        throw new Error(error)
    }

})

//block user
export const blockUser = asyncHandler(async (req, res) => {
    const { id } = req.params
    validateMongoDbId(id)
    try {
        const user = await User.findByIdAndUpdate(id, {
            isBlocked: true
        }, {
            new: true
        })
        res.json({
            message: `user ${user.firstName} is blocked.`
        })
    } catch (error) {
        throw new Error(error)
    }
})
//Un block user
export const unBlockUser = asyncHandler(async (req, res) => {
    const { id } = req.params
    validateMongoDbId(id)
    try {
        const user = await User.findByIdAndUpdate(id, {
            isBlocked: false
        }, {
            new: true
        })
        res.json({
            message: `user ${user.firstName} Unblocked.`
        })
    } catch (error) {
        throw new Error(error)
    }
})

// handle refreshed token
export const handleRefreshedToken = asyncHandler(async (req, res) => {
    const cookie = req.cookies
    if (!cookie?.refreshToken) throw new Error('No refresh token in cookies')
    const refreshToken = cookie.refreshToken
    const user = await User.findOne({ refreshToken })
    if (!user) throw new Error('No refresh token is in Db or not matched')
    jwt.verify(refreshToken, process.env.JWT_SECRET_KEY, (err, decoded) => {
        if (err || user.id !== decoded.id) {
            throw new Error('There is something wrong with refresh token')
        }
        const accessToken = generateToken(user._id)
        res.json({ accessToken })

    })
})

// logout
export const logOut = asyncHandler(async (req, res) => {
    const cookie = req.cookies
    if (!cookie?.refreshToken) throw new Error('No refresh token in cookies')
    const refreshToken = cookie.refreshToken
    const user = await User.findOne({ refreshToken })
    if (!user) {
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: true
        })
        return res.sendStatus(204) // forbidden
    }
    await User.findOneAndUpdate({ refreshToken }, {
        refreshToken: ""
    })
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: true
    })
    return res.sendStatus(204)

})

export const updatePassword = asyncHandler(async (req, res) => {
    const { _id } = req.user
    const password = req.body.password
    validateMongoDbId(_id)
    const user = await User.findById(_id)
    if (user) {
        user.password = password
        const updatePass = await user.save()
        res.status(200).json({
            msg: "Password Reset Successful"
        })
    } else {
        res.json({
            msg: "Invalid request"
        })
    }
})

export const forgetPasswordToken = asyncHandler(async (req, res) => {
    const { email } = req.body
    const user = await User.findOne({ email })
    if (!user) throw new Error('User not found with this email')

    try {
        const token = await user.createPasswordResetToken()
        await user.save()
        const resetUrl = `Hi, Please follow this link to reset your password. This link is valid till 10 minutes from now, <a href='http://localhost:1896/api/user/reset-password/${token}'>Click Here</a>`
        const data = {
            to: email,
            subject: "Password Reset Link",
            html: resetUrl,
            text: `Hey ${user.firstName}`
        }
        sendEmail(data)
        res.json(token)
    } catch (err) {
        throw new Error(err)
    }
})

export const resetPassword = asyncHandler(async (req, res) => {
    const { password } = req.body
    const { token } = req.params
    const hashedToken = crypto.createHash('sha256')
        .update(token)
        .digest('hex')
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    })
    if (!user) throw new Error('Token Expired, please try again later...')

    user.password = password
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save()
    res.json(user)
})

// Admin login
export const adminLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body

    // check user exists or not
    const findAdmin = await User.findOne({ email })
    if (findAdmin.role !== 'Admin') throw new Error('Not Auhtorised')
    const checkPass = await findAdmin.isPasswordMatched(password)

    if (findAdmin && checkPass) {
        const refreshToken = await generateRefreshToken(findAdmin?._id)
        const updateUser = await User.findByIdAndUpdate(findAdmin?._id, {
            refreshToken: refreshToken
        }, { new: true })
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            maxAge: 22 * 60 * 60 * 1000,
        })
        res.status(200).json({
            _id: findAdmin?._id,
            firstName: findAdmin?.firstName,
            lastName: findAdmin?.lastName,
            email: findAdmin?.email,
            mobile: findAdmin?.mobile,
            token: generateToken(findAdmin?._id),
        })
    } else {
        throw new Error('Invalid Credentials')
    }
})

// Wishlist
export const getWishlist = asyncHandler(async (req, res) => {
    const { _id } = req.user
    try {
        const findUser = await User.findById(_id).populate('wishList')
        res.json(findUser)
    } catch (err) {
        throw new Error(err)
    }
})

// Save address
export const saveAddress = asyncHandler(async (req, res, next) => {
    const { _id } = req.user
    validateMongoDbId(_id)

    try {
        const findUser = await User.findByIdAndUpdate(
            _id,
            {
                address: req?.body?.address,
            },
            {
                new: true
            })
        res.json(findUser)
    } catch (err) {
        throw new Error(err)
    }
})

export const userCart = asyncHandler(async (req, res) => {
    const { cart } = req.body
    const { _id } = req.user
    validateMongoDbId(_id)
    try {
        let products = []
        const user = await User.findById(_id)
        // check user already have products in cart
        const alreadyExistCart = await Cart.findOne({ orderby: user._id })
        if (alreadyExistCart) {
            alreadyExistCart.remove()
        }

        for (let i = 0; i < cart.length; i++) {
            let obj = {}
            obj.product = cart[i]._id
            obj.count = cart[i].count
            obj.color = cart[i].color
            let getPrice = await Product.findById(cart[i]._id).select("price").exec()
            obj.price = getPrice.price
            products.push(obj)
        }
        let cartTotal = 0;
        for (let i = 0; i < products.length; i++) {
            cartTotal = cartTotal + products[i].price * products[i].count
        }

        let newCart = await new Cart({
            products,
            cartTotal,
            orderBy: user?._id
        }).save()

        res.json(newCart)


    } catch (err) {
        throw new Error(err)
    }
})

export const getUserCart = asyncHandler(async (req, res) => {
    const { _id } = req.user
    validateMongoDbId(_id)
    try {
        const cart = await Cart.findOne({ orderBy: _id }).populate("products.product")
        res.json(cart)
    } catch (err) {
        throw new Error(err)
    }
})

export const emptyCart = asyncHandler(async (req, res) => {
    const { _id } = req.user
    validateMongoDbId(_id)
    try {
        const user = await User.findOne(_id)
        const cart = await Cart.findOneAndRemove({ orderBy: user._id })
        res.json(cart)
    } catch (err) {
        throw new Error(err)
    }
})

export const applyCoupon = asyncHandler(async (req, res) => {
    const { coupon } = req.body
    const { _id } = req.user
    validateMongoDbId(_id)
    const validCoupon = await Coupon.findOne({ name: coupon })
    if (validCoupon == null) {
        throw new Error('Invalid Coupon')
    }
    const user = await User.findOne(_id)
    console.log(user)
    let { products, cartTotal } = await Cart.findOne({ orderBy: user._id }).populate("products.product")
    let totalAfterDiscount = (cartTotal - (cartTotal * validCoupon.discount) / 100).toFixed(2)
    await Cart.findOneAndUpdate(
        { orderBy: user._id },
        { totalAfterDiscount },
        { new: true })
    res.json(totalAfterDiscount)
})

export const createCashOrder = asyncHandler(async (req, res) => {
    const { COD, couponApplied } = req.body
    const { _id } = req.user
    validateMongoDbId(_id)
    try {
        if (!COD) throw new Error("Create Cash Order Failed")
        const user = await User.findById(_id)
        let userCart = await Cart.findOne({ orderBy: user._id })
        let finalAmount = 0
        if (couponApplied && userCart.totalAfterDiscount) {
            finalAmount = userCart.totalAfterDiscount
        } else {
            finalAmount = userCart.cartTotal
        }

        let newOrder = await new Order({
            products: userCart.products,
            paymentIntent: {
                id: uniqid(),
                method: "COD",
                amount: finalAmount,
                status: "Cash On Delivery",
                created: Date.now(),
                currency: "Rs."

            },
            orderBy: user._id,
            orderStatus: "Cash On Delivery"
        }).save()

        let update = userCart.products.map((item) => {
            return {
                updateOne: {
                    filter: { _id: item.product._id },
                    update: { $inc: { quantity: item.count, sold: +item.count } }
                }
            }
        })

        const updated = await Product.bulkWrite(update, {})
        res.json({
            message: "success"
        })
    } catch (err) {
        throw new Error(err)
    }
})

export const getOrders = asyncHandler(async (req, res) => {
    const { _id } = req.user
    validateMongoDbId(_id)
    try {
        const userOrders = await Order.findOne({ orderBy: _id }).populate('products.product').exec()
        res.json(userOrders)
    } catch (err) {
        throw new Error(err)
    }
})


export const updateOrderStatus = asyncHandler(async (req, res) => {
    const { status } = req.body
    const { id } = req.params
    validateMongoDbId(id)
    try {
        const updateOrderStatus = await Order.findByIdAndUpdate(id, {
            orderStatus: status,
            paymentIntent: {
                status: status
            }
        },
            {
                new: true
            })
        res.json(updateOrderStatus)
    } catch (err) {
        throw new Error(err)
    }
})
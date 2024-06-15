import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import { isObjectIdOrHexString } from "mongoose";
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import uniqid from 'uniqid'
import User from '../models/userModel'
import createError from 'http-errors'
import { registerSchema, loginSchema } from "../utils/joiValidationSchema";
import { sendToken, signRefreshToken, verifyRefreshToken } from "../utils/jwtHelper";
import { redis } from "../configs/redis";
import ejs from 'ejs';
import path from "path";
import sendMail from "../utils/sendMail";

export const createActivationToken = (user) => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

    const token = jwt.sign(
        {
            user,
            activationCode,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: "5m",
        }
    );

    return { token, activationCode };
};

// User Registration
export const registerUser = async (req, res) => {

    let validUserInput = await registerSchema.validateAsync(req.body)
    const hashedPassword = await bcrypt.hash(validUserInput.password, await bcrypt.genSalt(10))
    let user = { ...validUserInput, "password": hashedPassword }

    try {
        const userExists = await User.findOne({ email: user.email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const activationToken = createActivationToken(user);
        const activationCode = activationToken.activationCode;

        const data = { user: { userName: user.userName }, activationCode }
        const html = await ejs.renderFile(
            path.join(__dirname, "../mails/activationMail.ejs"),
            data
        );

        try {
            await sendMail({
                email: user.email,
                subject: "Activate your account",
                template: "activationMail.ejs",
                data,
            });
            res.status(201).json({
                success: true,
                message: `Please check your email: ${user.email} to activate your account!`,
                activationToken: activationToken.token,
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }

        // res.status(201).json({ message: 'User registered successfully. Please check your email for the verification code.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const activateAccount = async (req, res) => {
    try {
        const { activation_token, activation_code } = req.body

        const newUser = jwt.verify(activation_token, process.env.ACCESS_TOKEN_SECRET)

        if (newUser.activationCode !== activation_code) {
            throw new Error('Invalid activation code.')
        }

        const userExists = await User.findOne({ email: newUser.email })
        if (userExists) throw new Error('Account already exists.')

        const extractUser = { ...newUser.user }
        const user = await User.create({
            email: newUser.user.email,
            password: newUser.user.password,
            firstName: newUser.user.firstName,
            lastName: newUser.user.lastName,
            userName: newUser.user.userName,
            phoneNumber: newUser.user.phoneNumber,
        })

        res.status(201).json({
            success: 'Account activated.'
        })
    } catch (error) {
        res.status(404).json({
            message: error.stack
        })
    }
}

export const loginUser = async (req, res) => {
    let validUserInput = await loginSchema.validateAsync(req.body)

    try {
        if (!validUserInput) throw new Error({ message: "Invalid username or Password" })

        let foundUser = await User.findOne({ userName: validUserInput.userName }).select("+password")
        if (!foundUser) throw new Error({ message: "Invalid username or Password" })

        let matchPassword = await foundUser.isValidPassword(validUserInput.password)
        if (!matchPassword) throw new Error({ message: "Invalid username or Password" })

        sendToken(foundUser, 200, res)
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: 'Server error' });
    }
};

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

export const updateAccessToken = asyncHandler(
    async (req, res, next) => {
        try {
            const refresh_token = req.cookies.refreshToken;
            console.log(refresh_token)
            const decoded = jwt.verify(
                refresh_token,
                process.env.REFRESH_TOKEN_SECRET
            );

            const message = "Could not refresh token";
            if (!decoded) {
                return next(new ErrorHandler(message, 400));
            }
            const session = await redis.get(decoded.id);

            if (!session) {
                return next(
                    new ErrorHandler("Please login for access this resources!", 400)
                );
            }

            const user = JSON.parse(session);

            const accessToken = jwt.sign(
                { id: user._id },
                process.env.ACCESS_TOKEN,
                {
                    expiresIn: "5m",
                }
            );

            const refreshToken = jwt.sign(
                { id: user._id },
                process.env.REFRESH_TOKEN,
                {
                    expiresIn: "3d",
                }
            );

            req.user = user;

            res.cookie("accessToken", accessToken, accessTokenOptions);
            res.cookie("refreshToken", refreshToken, refreshTokenOptions);

            await redis.set(user._id, JSON.stringify(user), "EX", 604800); // 7days

            return next();
        } catch (error) {
            return next(new ErrorHandler(error.message, 400));
        }
    }
);

// Logout
export const logoutUser = asyncHandler(
    async (req, res,) => {
        try {
            res.cookie("accessToken", "", { maxAge: 1 });
            res.cookie("refreshToken", "", { maxAge: 1 });
            const userId = req.user?._id || "";
            await redis.del(userId);
            res.status(200).json({
                success: true,
                message: "Logged out successfully",
            });
        } catch (error) {
            return next(new ErrorHandler(error.message, 400));
        }
    }
);

//   Verify account
export const verifyAccount = async (req, res) => {
    const { verificationCode } = req.body;
    const { userId } = req.params;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.verificationCode !== verificationCode) {
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        if (user.verificationCodeExpires < Date.now()) {
            return res.status(400).json({ message: 'Verification code expired' });
        }

        user.isVerified = true;
        user.verificationCode = undefined;
        user.verificationCodeExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Account verified successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Resend Verification code
export const resendVerificationCode = async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
        const verificationCodeExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

        user.verificationCode = verificationCode;
        user.verificationCodeExpires = verificationCodeExpires;
        await user.save();

        const emailTemplate = await ejs.renderFile(
            path.join(__dirname, '..', 'views', 'verification_email.ejs'),
            { user, verificationCode }
        );

        const mailOptions = {
            from: 'your-email@example.com',
            to: user.email,
            subject: 'Verify your E-Learning account',
            html: emailTemplate,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                return res.status(500).json({ message: 'Error sending email' });
            }
            console.log('Email sent: ' + info.response);
            res.status(200).json({ message: 'Verification code resent successfully' });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
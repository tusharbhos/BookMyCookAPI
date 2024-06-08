import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import uniqid from 'uniqid'
import User from '../models/userModel'
import createError from 'http-errors'
import { registerSchema, loginSchema } from "../utils/joiValidationSchema";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwtHelper";
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

    let validUser = await registerSchema.validateAsync(req.body)
    const hashedPassword = await bcrypt.hash(validUser.password, await bcrypt.genSalt(10))
    let user = { ...validUser, "password": hashedPassword }

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
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (!user.isVerified) {
            return res.status(401).json({ message: 'Please verify your account' });
        }

        const token = generateToken(user._id);

        res.status(200).json({ token, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
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

// Logout
export const logoutUser = async (req, res) => {
    try {
        // Clear the token from the client-side storage (e.g., localStorage, cookies)
        res.clearCookie('token');
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

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
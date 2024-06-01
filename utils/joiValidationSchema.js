import Joi from "@hapi/joi";

const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
// Username = valid_username_with_underscore

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
// Password = Pas$Word123

const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
// email = another.example@subdomain.example.co.uk

const indianPhoneNumberRegex = /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[6789]\d{9}$/;
// Phone Number = +919876543210
// 09876543210
// 91-9876543210
// 91 9876543210

export const registerSchema = Joi.object({
    email: Joi.string().regex(emailRegex).required().email(),
    userName: Joi.string().regex(usernameRegex).required(),
    password: Joi.string().regex(passwordRegex).required().min(8),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    phoneNumber: Joi.string().regex(indianPhoneNumberRegex).required(),
    role: Joi.string()
})

export const loginSchema = Joi.object({
    userName: Joi.string().regex(usernameRegex).required(),
    password: Joi.string().regex(passwordRegex).required().min(8),
}) 
import { Schema, model } from "mongoose";
import bcrypt from 'bcrypt'

const addressSchema = new Schema({
  type: { type: String, enum: ['Home', 'Work', 'Other'] },
  line1: { type: String },
  line2: { type: String },
  city: { type: String },
  state: { type: String },
  zipCode: { type: String },
  country: { type: String }
}, { _id: false });


const userSchema = new Schema({
  userName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true,
    lowercase: true
  },
  lastName: {
    type: String,
    required: true,
    lowercase: true
  },
  phoneNumber: {
    type: String,
    unique: true
  },
  role: {
    type: String,
    enum: ['Admin', 'RestaurantAdmin', 'User'],
    default: 'User'
  },
  dateOfBirth: {
    type: Date
  },
  addresses: {
    type: [addressSchema],
    default: []
  },
  preferredPaymentMethod: {
    type: String
  },
  preferredCuisine: [String],
  dietaryRestrictions: [String],
  receiveNewsletter: {
    type: Boolean,
    default: false
  },
  notificationPreferences: {
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    }
  },
  orderHistory: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Order'
    }
  ],
  paymentMethods: [
    {
      cardType: {
        type: String
      },
      cardNumber: {
        type: String
      },
      expiryDate: {
        type: String
      },
      cardHolderName: {
        type: String
      }
    }
  ],
  refreshToken: {
    type: String
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorCode: {
    type: String
  },
  twoFactorExpires: {
    type: Date
  },
},
  {
    timestamps: true
  });

userSchema.pre('save', async function (next) {
  try {
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(this.password, salt)
    this.password = hashedPassword
  } catch (error) {
    next(error)
  }
})

userSchema.methods.isValidPassword = async function (password) {
  try {
    return await bcrypt.compare(password, this.password)
  } catch (error) {
    throw error
  }
}

const User = model('User', userSchema);
module.exports = User;





// Example
/*
const userDocumentExample = {
  "_id": "60b8d295f1c2f4a8c1d42c71",
  "username": "john_doe",
  "email": "john.doe@example.com",
  "password": "$2b$10$EixZaYVK1fsbw1ZfbX3OXe.P8T5Z6hxGZxQ4UahXh5H.i1gInVz8W", // Hashed password
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "123-456-7890",
  "dateOfBirth": "1980-01-01T00:00:00.000Z",
  "addresses": [
    {
      "type": "Home",
      "line1": "123 Main St",
      "line2": "Apt 4B",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    },
    {
      "type": "Work",
      "line1": "456 Business Rd",
      "line2": "",
      "city": "New York",
      "state": "NY",
      "zipCode": "10002",
      "country": "USA"
    }
  ],
  "preferredPaymentMethod": "Credit Card",
  "preferredCuisine": ["Italian", "Mexican"],
  "dietaryRestrictions": ["Vegetarian"],
  "receiveNewsletter": true,
  "notificationPreferences": {
    "email": true,
    "sms": true,
    "push": true
  },
  "orderHistory": [
    "60b8d295f1c2f4a8c1d42c73",
    "60b8d295f1c2f4a8c1d42c74"
  ],
  "paymentMethods": [
    {
      "cardType": "Visa",
      "cardNumber": "4111111111111111",
      "expiryDate": "12/25",
      "cardHolderName": "John Doe"
    },
    {
      "cardType": "MasterCard",
      "cardNumber": "5555555555554444",
      "expiryDate": "10/24",
      "cardHolderName": "John Doe"
    }
  ],
  "resetPasswordToken": "reset_token_example",
  "resetPasswordExpires": "2024-06-01T12:00:00.000Z",
  "twoFactorEnabled": false,
  "twoFactorCode": "123456",
  "twoFactorExpires": "2024-05-30T12:00:00.000Z",
  "createdAt": "2024-05-30T12:00:00.000Z",
  "updatedAt": "2024-05-30T12:00:00.000Z"
};

module.exports = userDocumentExample;*/
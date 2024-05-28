const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { Schema } = mongoose;

// Define the MenuItem schema
const menuItemSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        price: {
            type: Number,
            required: true,
        },
        photos: [
            {
                type: String,
                trim: true,
            },
        ],
        category: {
            type: String,
            enum: ["appetizer", "main_course", "dessert", "beverage"],
        },
        ingredients: [
            {
                type: String,
                trim: true,
            },
        ],
        allergens: [
            {
                type: String,
                trim: true,
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Define the Booking schema
const bookingSchema = new Schema(
    {
        bookingID: {
            type: String,
            required: true,
            unique: true,
        },
        specialistID: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        eventDetails: {
            type: String,
            trim: true,
        },
        budgetRange: {
            type: String,
            trim: true,
        },
        eventType: {
            type: String,
            trim: true,
        },
        specialRequests: {
            type: String,
            trim: true,
        },
        date: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Define the User schema
const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        validate: {
            validator: function (v) {
                return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(v);
            },
            message: props =>
                `${props.value} is not a valid password. It should contain at least 8 characters, including alphabets and numbers.`
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}\.com$/, 'Please enter a valid email address ending with .com'],
    },
    phoneNumber: {
        type: String,
        required: true
    },
    location: {
        type: String
    },
    registrationDate: {
        type: Date,
        default: Date.now
    },
    gender: {
        type: String,
        enum: ["male", "female", "other"]
    },
    adhaarCard: {
        type: String
    },
    panCard: {
        type: String
    },
    occupation: {
        type: String,
        enum: ["user", "cook", "chef", "caterer", "bartender"],
    },
    profilePicture: {
        type: String
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    refreshToken: {
        type: String
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    specialties: {
        type: Schema.Types.ObjectId,
        ref: "MenuItem",
        default: [],
    },
    menu: {
        type: Schema.Types.ObjectId,
        ref: "MenuItem",
        default: [],
    },
    availability: {
        type: String,
        enum: ['available', 'not available']
    },
    experience: {
        type: Number
    },
    signatureCocktails: {
        type: String
    },
    openBarService: {
        type: Boolean
    },
    customizationOfDrinkMenus: {
        type: Boolean
    },
    bookings: [
        {
            type: Schema.Types.ObjectId,
            ref: "Booking"
        }
    ],
});

// Middleware for hashing passwords before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (
    candidatePassword,
    userPassword
) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

// Export the schema
const User = mongoose.model("User", userSchema);
const Booking = mongoose.model("Booking", bookingSchema);
const MenuItem = mongoose.model("MenuItem", menuItemSchema);

module.exports = { User, Booking, MenuItem };

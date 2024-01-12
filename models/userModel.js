const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, "Please Enter Your First Name"],
    },
    lastName: {
        type: String,
        required: [true, "Please Enter Your Last Name"],
    },
    email: {
        type: String,
        required: [true, "Please Enter Your Email"],
        unique: true
    },
    password: {
        type: String,
        required: [true, "Please Enter Your Password"],
        minLength: [8, "Password should have atleast 8 chars"],
        select: false,
    },
    role: {
        type: String,
        default: "user",
        enum: ['user', 'buyer', 'seller', 'admin']
    },
    // cardDetails: {
    //     cardName: {
    //         type: String,
    //         required: true,
    //     },
    //     cardNumber: {
    //         type: String,
    //         required: true
    //     },
    //     cardYear: {
    //         type: String,
    //         required: true,
    //         length: 2
    //     },
    //     cardMonth: {
    //         type: String,
    //         required: true,
    //         length: 2
    //     },
    //     cardCvv: {
    //         type: String,
    //         required: true,
    //         length: 3
    //     }
    // },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
});

userSchema.pre("save", async function (next) {

    if (!this.isModified("password")) {
        next();
    }

    this.password = await bcrypt.hash(this.password, 10);
});


userSchema.methods.getJWTToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET || 'WFFWf15115U842UGUBWF81EE858UYBY51BGBJ5E51Q', {
        expiresIn: process.env.JWT_EXPIRE || '7d'
    });
}

userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
}

userSchema.methods.getResetPasswordToken = async function () {

    // generate token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // generate hash token and add to db
    this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    return resetToken;
}

module.exports = mongoose.model('User', userSchema);
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
});

userSchema.statics.findAndValidate = async function (username, password) {
    const foundUser = await this.findOne({ username })
    if (!foundUser) {
        return false;
    }
    const isValid = await bcrypt.compare(password, foundUser.password)
    if (!isValid) {
        return false;
    }
    return foundUser;
}

module.exports = mongoose.model('User', userSchema);

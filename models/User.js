const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },  //used to log in.
  passwordHash: { type: String, required: true },   //never store raw password.
  role: { type: String, enum: ['user', 'admin'], default: 'user'}  //defines if this user is admin or normal.
}); 

module.exports = mongoose.model('User' , userSchema);
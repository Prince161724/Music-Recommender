import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String }, // null for Google login users
  name: { type: String, required: true },
  googleId: { type: String, default: null },
  likedSongs: [{
    name: { type: String, required: true },
    artist: { type: String, required: true },
    url: { type: String },
    duration: { type: Number },
    match: { type: Number },
    image: { type: String },
    likedAt: { type: Date, default: Date.now }
  }],
  searchHistory: [{
    query: { type: String, required: true },
    songName: { type: String },
    artistName: { type: String },
    searchedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcryptjs.hash(this.password, 10);
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcryptjs.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;

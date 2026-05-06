import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { main } from './ai.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import { authMiddleware } from './middleware/auth.js';

dotenv.config();

const app = express();
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"]
}));
app.use(express.json());

// ===== HEALTH CHECK ROUTE =====
app.get('/health', (req, res) => {
    res.status(200).send('Server is awake and healthy');
});

// ===== CONNECT TO MONGODB =====
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ===== PUBLIC ROUTES =====
app.use('/auth', authRoutes);

// ===== PROTECTED ROUTES =====
app.use('/user', authMiddleware, userRoutes);

// ===== GET SIMILAR SONGS (works for both logged-in and guest) =====
app.post('/getSimilarSongs', async (req, res) => {
    console.log(req.body.link);
    const list = await main(req.body.link);
    return res.json({ list: list });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

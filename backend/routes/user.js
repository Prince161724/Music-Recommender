import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// ===== LIKE A SONG =====
router.post('/like', async (req, res) => {
  try {
    const { name, artist, url, duration, match, image } = req.body;
    if (!name || !artist) {
      return res.status(400).json({ error: 'Song name and artist required' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check if already liked
    const alreadyLiked = user.likedSongs.find(
      s => s.name === name && s.artist === artist
    );
    if (alreadyLiked) {
      return res.status(400).json({ error: 'Song already liked' });
    }

    user.likedSongs.push({ name, artist, url, duration, match, image });
    await user.save();

    return res.json({ message: 'Song liked', likedSongs: user.likedSongs });
  } catch (err) {
    console.error('Like error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ===== UNLIKE A SONG =====
router.post('/unlike', async (req, res) => {
  try {
    const { name, artist } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.likedSongs = user.likedSongs.filter(
      s => !(s.name === name && s.artist === artist)
    );
    await user.save();

    return res.json({ message: 'Song unliked', likedSongs: user.likedSongs });
  } catch (err) {
    console.error('Unlike error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ===== GET LIKED SONGS =====
router.get('/liked', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ likedSongs: user.likedSongs });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// ===== ADD SEARCH HISTORY =====
router.post('/history', async (req, res) => {
  try {
    const { query, songName, artistName } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.searchHistory.unshift({ query, songName, artistName });
    // Keep only last 50 searches
    if (user.searchHistory.length > 50) {
      user.searchHistory = user.searchHistory.slice(0, 50);
    }
    await user.save();

    return res.json({ message: 'History saved' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// ===== GET SEARCH HISTORY =====
router.get('/history', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ searchHistory: user.searchHistory });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;

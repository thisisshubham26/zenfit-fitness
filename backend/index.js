const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'zenfit_secret_key';

// Middleware
app.use(cors());
app.use(express.json());

// In-Memory Backup (if MongoDB is down)
let users = [
    { id: '1', email: 'admin@zenfit.com', password: '', role: 'admin' },
    { id: '2', email: 'member@zenfit.com', password: '', role: 'member' }
];
let weights = [];
let consistencies = [];

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
let isConnected = false;

mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => { isConnected = true; console.log('Successfully connected to MongoDB.'); })
  .catch(err => { isConnected = false; console.error('MongoDB not detected. Using fail-safe mode.'); });

// Models
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' }
});
const User = mongoose.model('User', UserSchema);

const WeightSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: String,
    weight: Number
});
const Weight = mongoose.model('Weight', WeightSchema);

const ConsistencySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: String,
    status: Boolean
});
const Consistency = mongoose.model('Consistency', ConsistencySchema);

// Auth Middleware
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) { res.status(400).json({ msg: 'Token is not valid' }); }
};

// Routes
app.post('/api/register', async (req, res) => {
    const { email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    if (isConnected) {
        const newUser = new User({ email, password: hashedPassword, role });
        await newUser.save();
        return res.json({ msg: 'Registered' });
    }
    users.push({ id: Date.now().toString(), email, password: hashedPassword, role });
    res.json({ msg: 'Registered in memory' });
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = isConnected ? await User.findOne({ email }) : users.find(u => u.email === email);
    if (!user) return res.status(400).json({ msg: 'User does not exist' });

    // Skip bcrypt for our hardcoded demo users if they have no password set
    if (user.password) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id || user.id, role: user.role }, JWT_SECRET);
    res.json({ token, user: { email: user.email, role: user.role } });
});

// Member Data Routes
app.get('/api/weight', auth, async (req, res) => {
    if (isConnected) {
        const history = await Weight.find({ userId: req.user.id }).sort({ date: 1 });
        return res.json(history);
    }
    res.json(weights.filter(w => w.userId === req.user.id));
});

app.post('/api/weight', auth, async (req, res) => {
    const { date, weight } = req.body;
    if (isConnected) {
        const newW = new Weight({ userId: req.user.id, date, weight });
        await newW.save();
        return res.json(newW);
    }
    weights.push({ userId: req.user.id, date, weight });
    res.json({ date, weight });
});

app.get('/api/consistency', auth, async (req, res) => {
    if (isConnected) {
        const results = await Consistency.find({ userId: req.user.id });
        return res.json(results);
    }
    res.json(consistencies.filter(c => c.userId === req.user.id));
});

app.post('/api/consistency', auth, async (req, res) => {
    const { date, status } = req.body;
    if (isConnected) {
        const updated = await Consistency.findOneAndUpdate(
            { userId: req.user.id, date }, { status }, { upsert: true, new: true }
        );
        return res.json(updated);
    }
    const idx = consistencies.findIndex(c => c.userId === req.user.id && c.date === date);
    if (idx > -1) consistencies[idx].status = status;
    else consistencies.push({ userId: req.user.id, date, status });
    res.json({ date, status });
});

// Admin Routes
app.get('/api/admin/members', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    if (isConnected) {
        const allUsers = await User.find({ role: 'member' }).select('-password');
        const allWeights = await Weight.find();
        return res.json({ allUsers, allWeights });
    }
    res.json({ allUsers: users.filter(u => u.role === 'member'), allWeights: weights });
});

// Deployment Logic: Serve static files in production
const path = require('path');
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '../frontend/dist', 'index.html'));
    });
}

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;

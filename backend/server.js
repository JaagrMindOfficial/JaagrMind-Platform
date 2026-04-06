require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./config/db');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const schoolRoutes = require('./routes/school');
const studentRoutes = require('./routes/student');
const ticketRoutes = require('./routes/tickets');
const previewRoutes = require('./routes/preview');

const app = express();
app.set('trust proxy', 1);

connectDB();

app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false
}));

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: 'Too many login attempts, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(globalLimiter);

if (process.env.NODE_ENV !== 'production') {
    const jwtSecret = process.env.JWT_SECRET || '';
    if (jwtSecret.length < 32) {
        console.warn('\n⚠️  WARNING: JWT_SECRET is weak (< 32 chars). Use a stronger secret in production!\n');
    }
}

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map(origin => origin.trim());

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            if (process.env.NODE_ENV !== 'production') {
                console.log('CORS blocked origin:', origin);
            }
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Disposition']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth/login', authLimiter);
app.use('/api/admin/login', authLimiter);
app.use('/api/school/login', authLimiter);
app.use('/api/student/login', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/preview', previewRoutes);

app.get('/api/health', (req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    res.json({
        status: 'ok',
        message: 'JaagrMind API is running',
        database: 'Supabase PostgreSQL',
        environment: isProduction ? 'production' : (process.env.NODE_ENV || 'development'),
        ...(isProduction ? {} : { allowedOrigins })
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err.stack);

    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ message: 'CORS policy does not allow this origin' });
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
    }

    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║     🧠 JaagrMind Backend Server                                  ║
║                                                                   ║
║     Running on: http://localhost:${PORT}                         ║
║     Environment: ${process.env.NODE_ENV || 'development'}         ║
║     Database: Supabase PostgreSQL                                 ║
║     CORS Origins: ${allowedOrigins.length} configured            ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;

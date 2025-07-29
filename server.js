const express = require('express');
const session = require('express-session');
const env = require('dotenv');
const cors = require('cors');
const MySQLStore = require('express-mysql-session')(session);
const { passport } = require('./config/passport');
const candidateRoutes = require('./routes/candidates');
const jobOpeningRoutes = require('./routes/jobs');
const applicationRoutes = require('./routes/applications');
const interviewerRoutes = require('./routes/interviewers');
const interviewRoutes = require('./routes/interviews');
const timeSlotRoutes = require('./routes/timeSlots');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const referenceRoutes = require('./routes/reference');

env.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: 'http://localhost:5174',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.set('trust proxy', true);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const options = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
};

const sessionStore = new MySQLStore(options);

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);
app.use('/candidates', candidateRoutes);
app.use('/jobs', jobOpeningRoutes);
app.use('/applications', applicationRoutes);
app.use('/interviewers', interviewerRoutes);
app.use('/interviews', interviewRoutes);
app.use('/timeslots', timeSlotRoutes);
app.use('/reference', referenceRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

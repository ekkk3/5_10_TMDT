const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const kdsRoutes = require('./routes/kds');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/kds', kdsRoutes);

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/', (req, res) => {
  res.redirect('/user/index.html');
});

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'fast-food-system' });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Khong tim thay API hoac file.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Loi server',
    details: process.env.NODE_ENV === 'production' ? undefined : err.details
  });
});

app.listen(PORT, () => {
  console.log(`Fast Food API dang chay tai http://localhost:${PORT}`);
});

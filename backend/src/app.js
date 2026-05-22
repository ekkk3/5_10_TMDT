const path = require('path');
const express = require('express');
const cors = require('cors');


const healthRoutes = require('./modules/health/health.routes');
const menuRoutes = require('./modules/menu/menu.routes');
const foodOptionsRoutes = require('./modules/food-options/food-options.routes');
const { notFoundHandler } = require('./middlewares/not-found.middleware');
const { errorHandler } = require('./middlewares/error-handler.middleware');


const app = express();


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/api/health', healthRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/food-options', foodOptionsRoutes);


app.use(express.static(path.join(__dirname, '..', '..', 'frontend', 'src')));


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'src', 'index.html'));
});


app.use(notFoundHandler);
app.use(errorHandler);


module.exports = app;

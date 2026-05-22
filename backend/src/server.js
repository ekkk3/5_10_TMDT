require('dotenv').config();

const app = require('./app');
const { env } = require('./config/env');

app.listen(env.port, () => {
  console.log(`Fast Food API is running at http://localhost:${env.port}`);
});

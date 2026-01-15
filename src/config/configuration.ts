import * as dotenv from 'dotenv';
dotenv.config();

export default () => ({
  port: process.env.PORT || 4000,
  db_url: process.env.MONGODB_URI,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  PARA_API_KEY: process.env.PARA_API_KEY,
  PARA_SECRET_KEY: process.env.PARA_SECRET_KEY,
});
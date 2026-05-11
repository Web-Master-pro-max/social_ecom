const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(`Database connected successfully (${process.env.DB_DIALECT})`);
    
    
    await sequelize.sync({ alter: true });
    console.log('All models synced');
  } catch (error) {
    console.error('Unable to connect to database:', error.message);
    console.warn('Database connection failed. API will continue running without database.');
    console.warn('Please check your database configuration and ensure:');
    console.warn(`  - Database host is reachable: ${process.env.DB_HOST}:3306`);
    console.warn(`  - Database credentials are correct (user: ${process.env.DB_USER})`);
    console.warn(`  - Database name exists: ${process.env.DB_NAME}`);
  }
};

module.exports = { sequelize, connectDB };
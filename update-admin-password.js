#!/usr/bin/env node

// This script updates the admin password directly in the database
// Usage: node update-admin-password.js

const { User } = require('./models');
const { sequelize } = require('./config/database');
const bcrypt = require('bcryptjs');

const updateAdminPassword = async () => {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connected successfully');

    const adminEmail = 'admin@apnamarket.com';
    const newPassword = 'shubham@admin';

    console.log(`Updating admin password for ${adminEmail}...`);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user
    const [updated] = await User.update(
      { password: hashedPassword },
      { where: { email: adminEmail } }
    );

    if (updated === 0) {
      console.error('Admin user not found!');
      console.log('Creating admin user...');
      
      await User.create({
        name: 'Apna Market Admin',
        email: adminEmail,
        password: newPassword,
        role: 'admin'
      });
      console.log('✓ Admin user created successfully');
    } else {
      console.log('✓ Admin password updated successfully');
    }

    console.log('\nCredentials:');
    console.log('Email:', adminEmail);
    console.log('Password:', newPassword);
    console.log('Role: admin');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

updateAdminPassword();

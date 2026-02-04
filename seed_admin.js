const mongoose = require('mongoose');
const AdminUser = require('./backend/models/AdminUser');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/social_media_platform')
  .then(async () => {
    // Delete existing owners to prevent duplicates if you run this twice
    await AdminUser.deleteMany({ role: 'owner' });
    
    const owner = new AdminUser({
      email: 'owner@admin.com',
      password: 'adminpassword123',
      role: 'owner'
    });
    
    await owner.save();
    console.log('\n--- SUCCESS ---');
    console.log('Owner Account Created!');
    console.log('Email: owner@admin.com');
    console.log('Password: adminpassword123');
    console.log('----------------\n');
    process.exit();
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

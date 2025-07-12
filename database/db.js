const mongoose = require('mongoose');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('VP MongoDB connected');
  } catch (err) {
    console.error('VP MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = {connectDB, supabase};
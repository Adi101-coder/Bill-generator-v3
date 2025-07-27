const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Use environment variable or fallback to local MongoDB for development
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bill-generator';
    
    console.log('Connecting to MongoDB...');
    console.log('MongoDB URI length:', mongoURI.length);
    console.log('Using database:', mongoURI.includes('localhost') ? 'Local MongoDB' : 'MongoDB Atlas');
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true,
      }
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });
    
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    
    // If it's an Atlas connection error, provide helpful instructions
    if (error.message.includes('whitelist')) {
      console.error('\n=== MONGODB ATLAS CONNECTION ISSUE ===');
      console.error('Your IP address is not whitelisted in MongoDB Atlas.');
      console.error('To fix this:');
      console.error('1. Go to MongoDB Atlas dashboard');
      console.error('2. Navigate to Network Access');
      console.error('3. Add your current IP address to the whitelist');
      console.error('4. Or add 0.0.0.0/0 to allow all IPs (less secure)');
      console.error('==========================================\n');
    }
    
    // For development, try to continue without database
    if (process.env.NODE_ENV !== 'production') {
      console.log('Continuing without database connection for development...');
      return;
    }
    
    throw error;
  }
};

module.exports = connectDB; 
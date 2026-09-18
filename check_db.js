const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Users/nitin/OneDrive/Desktop/projects/Work/zudo/server/server/.env' });

async function check() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/zudodb';
  console.log("URI:", uri);
  
  // 1. Connect to main DB
  const mainConn = await mongoose.createConnection(uri).asPromise();
  const MainProduct = mainConn.model('Product', require('c:/Users/nitin/OneDrive/Desktop/projects/Work/zudo/server/server/models/Product').schema);
  const mainCount = await MainProduct.countDocuments();
  console.log(`Main DB (zudodb) products count: ${mainCount}`);
  
  // 2. Connect to Bengaluru DB
  const blrUri = uri.replace('zudodb', 'zudo-bengaluru');
  const blrConn = await mongoose.createConnection(blrUri).asPromise();
  const BlrProduct = blrConn.model('Product', require('c:/Users/nitin/OneDrive/Desktop/projects/Work/zudo/server/server/models/Product').schema);
  const blrCount = await BlrProduct.countDocuments();
  console.log(`Bengaluru DB (zudo-bengaluru) products count: ${blrCount}`);

  mainConn.close();
  blrConn.close();
}

check();

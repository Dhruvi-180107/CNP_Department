import mongoose from 'mongoose';
import Event from './src/models/Event.js';

async function check() {
  await mongoose.connect('mongodb://127.0.0.1:27017/cnp_department');
  const events = await Event.find().limit(3).lean();
  console.log(JSON.stringify(events, null, 2));
  process.exit(0);
}
check();

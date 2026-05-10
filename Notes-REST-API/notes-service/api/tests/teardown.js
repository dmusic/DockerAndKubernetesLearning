import mongoose from 'mongoose';

export default async function globalTeardown() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}

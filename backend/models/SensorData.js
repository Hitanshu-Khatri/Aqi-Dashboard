import mongoose from 'mongoose';

const sensorDataSchema = new mongoose.Schema({
  aqi: {
    type: Number,
    required: true
  },
  temperature: {
    type: Number,
    required: true
  },
  humidity: {
    type: Number,
    required: true
  },
  pm2_5: {
    type: Number,
    required: true
  },
  pm10: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  dataSource: {
    type: String,
    enum: ['mock', 'real'],
    default: 'mock'
  },
  location: {
    latitude: Number,
    longitude: Number
  }
});

export const SensorData = mongoose.model('SensorData', sensorDataSchema);

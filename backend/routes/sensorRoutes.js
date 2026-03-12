import express from 'express';
import { SensorData } from '../models/SensorData.js';
import { convertToCSV, generateCSVFilename } from '../utils/csvGenerator.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const router = express.Router();

// POST /api/predict  — run ML model via Python
router.post('/predict', (req, res) => {
  const { aqi, temperature, humidity, pm2_5, pm10, recentAqi, minutesAhead, hour, dow } = req.body;

  if (aqi === undefined || minutesAhead === undefined) {
    return res.status(400).json({ error: 'aqi and minutesAhead are required' });
  }

  const scriptPath = path.join(__dirname, '..', 'predict.py');
  const pythonExe  = process.env.PYTHON_PATH || 'python';

  const py = spawn(pythonExe, [scriptPath]);

  let output = '';
  let errOut = '';

  py.stdout.on('data', (d) => { output += d.toString(); });
  py.stderr.on('data', (d) => { errOut += d.toString(); });

  py.on('close', (code) => {
    try {
      const result = JSON.parse(output.trim());
      if (result.error) {
        return res.status(500).json({ error: result.error });
      }
      return res.json(result);
    } catch {
      return res.status(500).json({ error: 'Python script error', details: errOut || output });
    }
  });

  // Send input as JSON to stdin
  py.stdin.write(JSON.stringify({ aqi, temperature, humidity, pm2_5, pm10,
    recentAqi: recentAqi || [aqi],
    minutesAhead, hour, dow }));
  py.stdin.end();
});

// POST - Save sensor data
router.post('/sensor-data', async (req, res) => {
  try {
    const { aqi, temperature, humidity, pm2_5, pm10, dataSource, location } = req.body;

    // Validate required fields
    if (aqi === undefined || temperature === undefined || humidity === undefined || pm2_5 === undefined || pm10 === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: aqi, temperature, humidity, pm2_5, pm10' 
      });
    }

    const sensorData = new SensorData({
      aqi,
      temperature,
      humidity,
      pm2_5,
      pm10,
      dataSource: dataSource || 'mock',
      location: location || null,
      timestamp: new Date()
    });

    await sensorData.save();
    res.status(201).json({ 
      success: true,
      message: 'Sensor data saved successfully',
      data: sensorData 
    });
  } catch (error) {
    console.error('Error saving sensor data:', error);
    res.status(500).json({ 
      error: 'Failed to save sensor data',
      details: error.message 
    });
  }
});

// GET - Fetch all sensor data with optional filtering
router.get('/sensor-data', async (req, res) => {
  try {
    const { dataSource, limit = 100, skip = 0 } = req.query;
    
    let query = {};
    if (dataSource) {
      query.dataSource = dataSource;
    }

    const data = await SensorData.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await SensorData.countDocuments(query);

    res.json({
      success: true,
      total,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sensor data',
      details: error.message 
    });
  }
});

// GET - Export sensor data as CSV
router.get('/sensor-data/export/csv', async (req, res) => {
  try {
    const { dataSource } = req.query;
    
    let query = {};
    if (dataSource) {
      query.dataSource = dataSource;
    }

    const data = await SensorData.find(query).sort({ timestamp: -1 });

    if (data.length === 0) {
      return res.status(404).json({ 
        error: 'No data available for export' 
      });
    }

    // Convert to plain objects and format timestamp
    const formattedData = data.map(item => ({
      aqi: item.aqi,
      temperature: item.temperature,
      humidity: item.humidity,
      pm2_5: item.pm2_5,
      pm10: item.pm10,
      timestamp: new Date(item.timestamp).toISOString(),
      dataSource: item.dataSource
    }));

    const csv = convertToCSV(formattedData);
    const filename = generateCSVFilename();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ 
      error: 'Failed to export CSV',
      details: error.message 
    });
  }
});

// GET - Get summary statistics
router.get('/sensor-data/stats', async (req, res) => {
  try {
    const { dataSource } = req.query;
    
    let query = {};
    if (dataSource) {
      query.dataSource = dataSource;
    }

    const stats = await SensorData.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          avgAQI: { $avg: '$aqi' },
          maxAQI: { $max: '$aqi' },
          minAQI: { $min: '$aqi' },
          avgTemperature: { $avg: '$temperature' },
          avgHumidity: { $avg: '$humidity' },
          avgPM2_5: { $avg: '$pm2_5' },
          avgPM10: { $avg: '$pm10' },
          totalReadings: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {}
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch statistics',
      details: error.message 
    });
  }
});

// DELETE - Clear all sensor data (for testing)
router.delete('/sensor-data', async (req, res) => {
  try {
    const result = await SensorData.deleteMany({});
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} records`
    });
  } catch (error) {
    console.error('Error deleting sensor data:', error);
    res.status(500).json({ 
      error: 'Failed to delete sensor data',
      details: error.message 
    });
  }
});

export default router;

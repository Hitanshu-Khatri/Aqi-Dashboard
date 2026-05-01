// API service for backend communication

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const sensorAPI = {
  // Save sensor data to database
  saveSensorData: async (sensorData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sensor-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', 
        },
        body: JSON.stringify(sensorData),
      });
 
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Fetch sensor data from database
  fetchSensorData: async (dataSource = null, limit = 100) => {
    const params = new URLSearchParams({ limit });
    if (dataSource) {
      params.append('dataSource', dataSource);
    }

    const response = await fetch(`${API_BASE_URL}/sensor-data?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return await response.json();
  },

  // Export data as CSV
  exportAsCSV: async (dataSource = null) => {
    try {
      const params = new URLSearchParams();
      if (dataSource) {
        params.append('dataSource', dataSource);
      }

      const response = await fetch(`${API_BASE_URL}/sensor-data/export/csv?${params}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'aqi-data.csv';
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="([^"]+)"/);
        if (matches) filename = matches[1];
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true, filename };
    } catch (error) {
      console.error('Error exporting CSV:', error);
      throw error;
    }
  },

  // Get statistics
  getStatistics: async (dataSource = null) => {
    try {
      const params = new URLSearchParams();
      if (dataSource) {
        params.append('dataSource', dataSource);
      }

      const response = await fetch(`${API_BASE_URL}/sensor-data/stats?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  },

  // Get model quality metrics for prediction panel
  getPredictionMetrics: async () => {
    const response = await fetch(`${API_BASE_URL}/predict/metrics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return await response.json();
  },

  // Clear all data (for testing)
  clearAllData: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sensor-data`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }
};

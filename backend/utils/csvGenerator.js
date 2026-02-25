import { Parser } from 'json2csv';

export const convertToCSV = (data) => {
  try {
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(data);
    return csv;
  } catch (error) {
    console.error('Error converting to CSV:', error);
    throw error;
  }
};

export const generateCSVFilename = () => {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  return `aqi-data-${timestamp}.csv`;
};

# TODO: Integrate Real Data from Index.tsx into HistoricalReport

## Steps to Complete

- [ ] Add historicalData state in Index.tsx to accumulate sensor data over time
- [ ] Modify fetchSensorData in Index.tsx to append fetched data to historicalData (map pm2_5 to pm25, timestamp to date)
- [ ] Update HistoricalReport component usage in Index.tsx to pass historicalData as prop
- [ ] Update HistoricalReport.tsx to accept historicalData prop instead of importing data
- [ ] Remove generateMockData function from HistoricalReport.tsx
- [ ] Remove import { data } from '../pages/Index' in HistoricalReport.tsx
- [ ] Change pm25 to pm2_5 in HistoricalData interface for consistency

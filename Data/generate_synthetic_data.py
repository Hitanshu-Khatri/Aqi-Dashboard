"""
Synthetic AQI Data Generator
-------------------------------
- Reads real sensor data from CSV
- Learns statistical patterns (mean, std, correlations, daily cycles)
- Generates ONE reading per hour continuously
- Output size is configurable (default: 8000 total rows)
"""

import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# ── 1. Load real data ──────────────────────────────────────────────────────────
INPUT_PATH = os.getenv(
    "AQI_SOURCE_DATA_PATH",
    r"c:\Users\Admin\AQI drone\Aqi-Dashboard\Data\aqi-data (16).csv",
)
df = pd.read_csv(INPUT_PATH)

if 'dataSource' in df.columns:
    real = df[df['dataSource'] == 'real'].copy()
else:
    real = df.copy()

real = real[real['aqi'] > 0]  # drop broken zero-readings

print(f"Real usable rows: {len(real)}")

# ── 2. Compute statistics from real data ──────────────────────────────────────
cols = ['aqi', 'temperature', 'humidity', 'pm2_5', 'pm10']
real[cols] = real[cols].apply(pd.to_numeric, errors='coerce')
real = real.dropna(subset=cols)

# Drop sensor-spike outliers (PM2.5 > 200 are clearly faulty readings)
before = len(real)
real = real[real['pm2_5'] <= 200]
print(f"Dropped {before - len(real)} outlier PM rows (pm2_5 > 200)")

mean  = real[cols].mean()
std   = real[cols].std()
corr  = real[cols].corr()

print("\nReal data statistics:")
print(mean.to_string())
print("\nCorrelation matrix:")
print(corr.round(2).to_string())

if 'location.latitude' in real.columns and real['location.latitude'].dropna().shape[0] > 0:
    LAT = float(real['location.latitude'].dropna().iloc[0])
else:
    LAT = 28.6139

if 'location.longitude' in real.columns and real['location.longitude'].dropna().shape[0] > 0:
    LON = float(real['location.longitude'].dropna().iloc[0])
else:
    LON = 77.2090

# ── 3. Cholesky decomposition to preserve correlations ────────────────────────
cov_matrix = corr.values * np.outer(std.values, std.values)  # covariance from corr
# Ensure positive-definite (tiny regularization)
cov_matrix += np.eye(len(cols)) * 1e-6

L = np.linalg.cholesky(cov_matrix)  # Cholesky factor

# ── 4. Daily cycle offsets (realistic college-area AQI pattern) ───────────────
# AQI/PM tends to peak in morning (8-10am) and evening (6-8pm), dip at noon
# Temperature peaks at 1-3pm, humidity is inverse to temperature
def daily_aqi_offset(hour):
    """AQI daily pattern offset relative to mean"""
    # Morning peak: +15, afternoon dip: -10, evening peak: +10, night: -5
    pattern = 15 * np.exp(-0.5 * ((hour - 9) / 1.5) ** 2) \
             + 10 * np.exp(-0.5 * ((hour - 19) / 1.5) ** 2) \
             - 10 * np.exp(-0.5 * ((hour - 13) / 2.0) ** 2) \
             - 5  * np.exp(-0.5 * ((hour -  3) / 2.0) ** 2)
    return pattern

def daily_temp_offset(hour):
    """Temperature daily cycle: peaks ~2pm, lowest ~4am"""
    return 4 * np.sin(np.pi * (hour - 4) / 12) - 1

def daily_humidity_offset(hour):
    """Humidity inversely tracks temperature"""
    return -8 * np.sin(np.pi * (hour - 4) / 12) + 2

# ── 5. Generate synthetic timestamps: 1 reading per hour ──────────────────────
TARGET_TOTAL_ROWS = int(os.getenv("AQI_TARGET_TOTAL_ROWS", "8000"))
OUTPUT_PATH = os.getenv(
    "AQI_EXPANDED_OUTPUT_PATH",
    r"c:\Users\Admin\AQI drone\Aqi-Dashboard\Data\aqi_expanded_8000.csv",
)

if TARGET_TOTAL_ROWS < len(real):
    raise ValueError(
        f"AQI_TARGET_TOTAL_ROWS ({TARGET_TOTAL_ROWS}) must be >= real rows ({len(real)})"
    )

TOTAL_SYNTHETIC = TARGET_TOTAL_ROWS - len(real)
print(
    f"\nGenerating {TOTAL_SYNTHETIC} synthetic hourly rows "
    f"(real: {len(real)}, target total: {TARGET_TOTAL_ROWS})"
)

# Base: start 33 days before the real data so timeline is continuous
first_real_ts = pd.to_datetime(real['timestamp'].min(), utc=True)
base_date = first_real_ts - timedelta(hours=TOTAL_SYNTHETIC)

np.random.seed(42)

# Simple AR(1) process to make consecutive readings temporally correlated
# (avoids the jumpy independent-sample problem)
synthetic_rows = []
aqi_prev  = float(mean['aqi'])

for h in range(TOTAL_SYNTHETIC):
    ts = base_date + timedelta(hours=h)
    hour_of_day = ts.hour + ts.minute / 60.0
    day_of_week = ts.weekday()

    # Daily cycle offsets
    aqi_offset  = daily_aqi_offset(hour_of_day)
    temp_offset = daily_temp_offset(hour_of_day)
    hum_offset  = daily_humidity_offset(hour_of_day)

    # Weekday effect: slightly higher AQI on Mon-Fri (college activity)
    weekday_boost = 5 if day_of_week < 5 else -5

    # AR(1) AQI: 70% autocorrelation + daily pattern + small noise
    target_aqi = float(mean['aqi']) + aqi_offset + weekday_boost
    aqi_val_f  = 0.7 * aqi_prev + 0.3 * target_aqi + np.random.normal(0, 4)
    aqi_prev   = aqi_val_f

    # Other features correlated with AQI via Cholesky
    z = np.random.standard_normal(len(cols))
    sample = (L @ z)

    aqi_val  = max(10,  min(300, round(aqi_val_f)))
    temp_val = max(20,  min(45,  round(float(mean['temperature']) + temp_offset + sample[1] * 0.4, 1)))
    hum_val  = max(20,  min(100, round(float(mean['humidity'])    + hum_offset  + sample[2] * 0.4, 1)))
    pm25_val = max(5,   min(200, round(aqi_val * float(mean['pm2_5']) / float(mean['aqi']) + sample[3] * 2)))
    pm10_val = max(pm25_val, min(250, round(aqi_val * float(mean['pm10']) / float(mean['aqi']) + sample[4] * 2)))

    synthetic_rows.append({
        '_id':               f'synth_{h:05d}',
        'aqi':               aqi_val,
        'temperature':       temp_val,
        'humidity':          hum_val,
        'pm2_5':             pm25_val,
        'pm10':              pm10_val,
        'timestamp':         ts.strftime('%Y-%m-%dT%H:%M:%S.000Z'),
        'dataSource':        'synthetic',
        'location':          '',
        '__v':               0,
        'location.latitude': LAT,
        'location.longitude':LON,
    })

synthetic_df = pd.DataFrame(synthetic_rows)

# ── 6. Combine real + synthetic and sort by time ──────────────────────────────
real_clean = real.copy()
real_clean['dataSource'] = 'real'

combined = pd.concat([real_clean, synthetic_df], ignore_index=True)
combined['timestamp'] = pd.to_datetime(combined['timestamp'])
combined = combined.sort_values('timestamp').reset_index(drop=True)

print(f"\nFinal dataset rows: {len(combined)}")
print(f"  Real:       {(combined['dataSource']=='real').sum()}")
print(f"  Synthetic:  {(combined['dataSource']=='synthetic').sum()}")
print(f"\nTime range:")
print(f"  First: {combined['timestamp'].min()}")
print(f"  Last:  {combined['timestamp'].max()}")
span_hours = (combined['timestamp'].max() - combined['timestamp'].min()).total_seconds() / 3600
print(f"  Span:  {span_hours:.1f} hours  ({span_hours/24:.1f} days)")

print("\nColumn stats of final dataset:")
print(combined[cols].describe().round(2).to_string())

# ── 7. Save ───────────────────────────────────────────────────────────────────
combined.to_csv(OUTPUT_PATH, index=False)
print(f"\nSaved to: {OUTPUT_PATH}")

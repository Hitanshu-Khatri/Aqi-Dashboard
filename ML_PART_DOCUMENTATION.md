# AQI Drone Dashboard - ML Part Documentation and Viva Guide

## 1) What this document is for
This document explains the machine learning part of the AQI Drone Dashboard project in a way you can present to faculty.
It covers:
- what was built
- how it was built
- why these design choices were made
- why the dashboard score is around 77%
- likely viva questions with ready answers
- smart counter-questions you can ask ma'am

## 2) One-line project summary
We built a data-driven AQI forecasting pipeline that takes live sensor readings (AQI, temperature, humidity, PM2.5, PM10), engineers time-series features, and predicts future AQI, with a production API connected to the dashboard.

## 3) My ownership (ML scope)
ML work ownership includes:
- data preparation and quality filtering
- feature engineering for time-series forecasting
- multi-horizon training pair creation
- model selection and hyperparameter tuning
- time-series-safe validation strategy
- model packaging and backend inference API integration
- model metrics endpoint for dashboard visualization

## 4) End-to-end ML flow
### 4.1 Data ingestion
Source file used for training:
- `Data/aqi_expanded_800.csv`

Pipeline script:
- `Data/aqi_ml_prediction.py`

The dataset includes both real and synthetic rows (`dataSource`).

### 4.2 Cleaning and outlier handling
- Numeric conversion is forced for AQI and pollution/weather columns.
- Missing values are dropped for required fields.
- IQR outlier filtering is applied on:
  - AQI
  - PM2.5
  - PM10

Reason: reduce noisy/extreme values that can destabilize tree splits and increase prediction variance.

### 4.3 Feature engineering
Engineered features include:
- Base sensor features: `aqi`, `temperature`, `humidity`, `pm2_5`, `pm10`
- Time cyclic encoding:
  - `hour_sin`, `hour_cos`
  - `dow_sin`, `dow_cos`
- Rolling features:
  - `aqi_roll3`, `aqi_roll6`
  - `temperature_roll3`, `humidity_roll3`, `pm2_5_roll3`, `pm10_roll3`
- Trend feature:
  - `aqi_trend`
- Lag features:
  - `aqi_lag1`, `aqi_lag3`, `aqi_lag6`
- Horizon feature:
  - `minutes_ahead`

Why this matters: AQI is temporal and context-dependent. Lags, trends, rolling means, and periodic time encoding help capture short-term momentum and daily/weekly cycles.

### 4.4 Target creation (multi-horizon)
Configured training horizons:
- 60 min
- 120 min
- 180 min

For each base timestamp, the script searches for a future row close to the target horizon using a tolerance window (`TARGET_TOLERANCE`).

Why this design:
- Real sensor timestamps are irregular
- exact +60/+120/+180 minute rows may not exist
- nearest valid future match improves usable sample count

### 4.5 Synthetic data handling
Sample weights:
- real row weight = `1.0`
- synthetic row weight = `0.35`

Why: synthetic data increases coverage but should not dominate real-world behavior.

### 4.6 Time-aware split and validation
This project avoids random shuffling for evaluation.

Used methods:
- Time-based holdout split (first 80% train, latest 20% test by time)
- `TimeSeriesSplit` cross-validation (5 splits)

Why: this simulates real deployment where future values must be predicted from past-only information.

### 4.7 Model and hyperparameter tuning
Base estimator:
- `RandomForestRegressor`

Tuning method:
- `RandomizedSearchCV` with time-series CV
- optimization target: negative MAE

Why Random Forest was selected:
- strong on tabular, mixed-scale features
- handles non-linear interactions well
- robust to moderate noise
- less feature scaling burden
- easy to deploy, stable in small/medium datasets
- supports tree-distribution-based uncertainty intervals

### 4.8 Final artifacts saved
Model package:
- `Data/models/aqi_flexible_model.pkl`

Also exported:
- feature importance CSV
- prediction interval test CSV (when enabled)

The saved model file contains:
- trained model object
- feature order list
- horizon metadata
- max minutes metadata
- metrics (test + CV)
- confidence interval config

## 5) Inference and backend integration
Inference script:
- `backend/predict.py`

Routes:
- `POST /api/predict` for AQI prediction
- `GET /api/predict/metrics` for model quality display

At runtime:
1. Backend receives current readings + recent AQI sequence.
2. Same feature logic is recreated as training-compatible input.
3. Model predicts AQI for requested `minutesAhead`.
4. Output is clamped to safe AQI range and returned.
5. If model supports trees, Q10/Q90 interval is also returned.

## 6) Why forecast is now fixed to 3 hours in UI
Current production/demo UI intentionally focuses on 3-hour prediction because:
- model was explicitly trained on 60/120/180 minutes
- short horizon values (example 5 min) can look unstable/unrealistic
- 3h output was judged most reliable for demo clarity and consistency

This is a product reliability decision, not a model failure.

## 7) Why score/accuracy is around 77%
Important: the dashboard score is a composite quality score, not pure classification accuracy.

In `backend/predict.py`, score is computed from:
- test MAE
- test R2
- stability gap between test MAE and CV MAE

Heuristic formula:
- `mae_score = clamp(100 - 2 * test_mae)`
- `r2_score_pct = clamp(((test_r2 + 1) / 2) * 100)`
- `stability_score = clamp(100 - 3 * abs(test_mae - cv_mae))`
- `overall = 0.50 * mae_score + 0.35 * r2_score_pct + 0.15 * stability_score`

So if your dashboard shows near 77, it means:
- error is moderate but acceptable
- explained variance is decent
- CV gap is controlled
- model is practical but not perfect

## 8) Why not other models (ready justification)
### Linear Regression
Rejected because AQI dynamics are non-linear and interaction-heavy.

### SVR
Can work, but tuning and scaling overhead is higher; slower for repeated experimentation.

### XGBoost/LightGBM
Strong candidates, but this project prioritized simpler dependency footprint and fast reliable deployment for current scope.

### LSTM/GRU
Needs larger sequential dataset, heavier tuning, and more training complexity than required for this stage.

Conclusion: Random Forest gave a strong accuracy-effort-deployability balance for this project stage.

## 9) Known limitations (say confidently)
- Domain shift: trained mostly on one environment; deployment in another location can reduce reliability.
- Horizon coverage: trained for 60/120/180 min, not very-short-horizon forecasting.
- Sensor noise and irregular sampling impact feature stability.
- More real labeled data should improve robustness.

## 10) Improvement roadmap
- collect more real-world data from multiple locations/seasons
- retrain with periodic schedule and model versioning
- compare against gradient boosting baseline
- add feature drift monitoring
- horizon-specific models (separate 60, 120, 180 heads)
- calibrated uncertainty intervals and alert confidence bands

## 11) Viva questions ma'am may ask (with ready answers)
### Q1: What problem does your ML model solve?
A: It forecasts future AQI from live drone/sensor readings so users can make proactive decisions instead of reacting only to current air quality.

### Q2: Why did you use time-series split instead of random split?
A: Random split leaks future patterns into training. Time-series split keeps chronology intact and gives realistic deployment-like validation.

### Q3: Why did you include synthetic data at all?
A: To improve coverage of conditions and increase training pairs. But we down-weighted synthetic rows to avoid overpowering real behavior.

### Q4: Why Random Forest?
A: It handles non-linear tabular data very well, is robust to noise, requires less preprocessing, and is reliable for our dataset size and timeline.

### Q5: What does 77% mean in your dashboard?
A: It is a composite quality score derived from MAE, R2, and validation stability; it is not plain classification accuracy.

### Q6: What metrics did you track?
A: MAE, RMSE, R2 on holdout test and on TimeSeriesSplit CV; plus confidence interval behavior for tree distributions.

### Q7: Why is 3-hour prediction shown in final UI?
A: Because model training horizons are 60/120/180 min and 3-hour output is most stable for demonstration reliability.

### Q8: How do you handle uncertainty?
A: For tree-based model, we compute Q10 and Q90 from per-tree predictions and return interval bounds from backend.

### Q9: How do you prevent overfitting?
A: Time-aware split, cross-validation on ordered folds, hyperparameter tuning, outlier filtering, and weighted handling of synthetic data.

### Q10: If accuracy must improve, what is your first action?
A: Collect more real location-diverse data and retrain with periodic drift-aware evaluation.

## 12) Counter-questions you can ask ma'am (smart and respectful)
Use only if discussion opens naturally.

1. "Would you prefer we report pure regression metrics only, or keep a composite score for dashboard readability as well?"
2. "For academic evaluation, should we compare Random Forest with one boosting baseline (like XGBoost) in the next iteration?"
3. "Do you want horizon-specific models (separate models per 60/120/180 min) for better interpretability?"
4. "Would adding drift monitoring and periodic retraining schedule be valuable for final submission quality?"
5. "Should we prioritize uncertainty calibration (interval reliability) as part of model quality section in the report?"

## 13) 90-second oral explanation script (you can memorize)
"Our ML module predicts future AQI from live drone sensor readings. I first cleaned and filtered the data, then created time-series features like lag values, rolling means, trend, and cyclic time encoding. Instead of random split, I used time-based split and TimeSeriesSplit cross-validation to keep evaluation realistic. I trained a tuned Random Forest model with RandomizedSearchCV and down-weighted synthetic rows so real data has stronger influence. The model is packaged with feature metadata and served via backend API. In production, the dashboard requests prediction and model metrics. The score around 77 is a composite of error, explained variance, and stability, indicating good practical performance but still room for improvement. For demo reliability, we fixed UI prediction to 3 hours because that is one of the trained horizons and gives stable output." 

## 14) Files to cite during explanation
- training pipeline: `Data/aqi_ml_prediction.py`
- inference and score logic: `backend/predict.py`
- prediction API route: `backend/routes/sensorRoutes.js`
- frontend ML prediction panel: `src/components/AQIPrediction.tsx`
- frontend metrics client: `src/services/sensorAPI.js`

## 15) Final note for viva
Do not claim "perfect accuracy".
Say: "The model is validated, deployable, and reasonably accurate for current data, and we have a clear improvement roadmap with more real-world data and stronger comparative baselines."

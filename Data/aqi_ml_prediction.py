"""
AQI flexible forecasting training (0-180 minutes)
Improvements included:
1) TimeSeriesSplit validation
2) Time-based train/test split
3) AQI lag features
4) Lower sample weight for synthetic rows
5) Outlier filtering (AQI, PM2.5, PM10)
6) RandomizedSearchCV hyperparameter tuning
7) Feature importance export
8) Optional prediction confidence intervals
"""

import os
import pickle
import warnings

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import RandomizedSearchCV, TimeSeriesSplit

warnings.filterwarnings("ignore")

DATA_PATH = r"c:\Users\Admin\AQI drone\Aqi-Dashboard\Data\aqi_expanded_800.csv"
MODEL_DIR = r"c:\Users\Admin\AQI drone\Aqi-Dashboard\Data\models"
os.makedirs(MODEL_DIR, exist_ok=True)

HORIZONS_MINUTES = [60, 120, 180]
TARGET_TOLERANCE = np.timedelta64(40 * 60, "s")
SYNTHETIC_WEIGHT = 0.35
RANDOM_STATE = 42
ENABLE_CONFIDENCE_INTERVALS = True

def iqr_filter(df: pd.DataFrame, column: str, k: float = 1.5) -> pd.DataFrame:
    q1 = df[column].quantile(0.25)
    q3 = df[column].quantile(0.75)
    iqr = q3 - q1
    lo = q1 - k * iqr
    hi = q3 + k * iqr
    return df[(df[column] >= lo) & (df[column] <= hi)]


def weighted_tscv_scores(model, X, y, sample_weight, splitter):
    maes, rmses, r2s = [], [], []
    for train_idx, val_idx in splitter.split(X):
        model.fit(X[train_idx], y[train_idx], sample_weight=sample_weight[train_idx])
        pred = model.predict(X[val_idx])
        maes.append(mean_absolute_error(y[val_idx], pred))
        rmses.append(np.sqrt(mean_squared_error(y[val_idx], pred)))
        r2s.append(r2_score(y[val_idx], pred))
    return {
        "cv_mae": float(np.mean(maes)),
        "cv_rmse": float(np.mean(rmses)),
        "cv_r2": float(np.mean(r2s)),
    }


print("Loading data...")
df = pd.read_csv(DATA_PATH)
df["timestamp"] = pd.to_datetime(df["timestamp"], format="mixed", utc=True)
df = df.sort_values("timestamp").reset_index(drop=True)

print(
    f"Loaded: {len(df)} rows | "
    f"{(df['dataSource'] == 'real').sum()} real | "
    f"{(df['dataSource'] == 'synthetic').sum()} synthetic"
)

num_cols = ["aqi", "temperature", "humidity", "pm2_5", "pm10"]
df[num_cols] = df[num_cols].apply(pd.to_numeric, errors="coerce")
df = df.dropna(subset=num_cols + ["timestamp", "dataSource"]).copy()

before = len(df)
for col in ["aqi", "pm2_5", "pm10"]:
    df = iqr_filter(df, col, k=1.5)
after = len(df)
print(f"Outlier filtering removed: {before - after} rows")

df = df.sort_values("timestamp").reset_index(drop=True)

df["hour"] = df["timestamp"].dt.hour
df["dow"] = df["timestamp"].dt.dayofweek
df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
df["dow_sin"] = np.sin(2 * np.pi * df["dow"] / 7)
df["dow_cos"] = np.cos(2 * np.pi * df["dow"] / 7)

for col in num_cols:
    df[f"{col}_roll3"] = df[col].rolling(3, min_periods=1).mean()
    df[f"{col}_roll6"] = df[col].rolling(6, min_periods=1).mean()

df["aqi_trend"] = df["aqi"] - df["aqi"].shift(3).fillna(df["aqi"])

# Requested lag features
df["aqi_lag1"] = df["aqi"].shift(1)
df["aqi_lag3"] = df["aqi"].shift(3)
df["aqi_lag6"] = df["aqi"].shift(6)

base_features = [
    "aqi",
    "temperature",
    "humidity",
    "pm2_5",
    "pm10",
    "hour_sin",
    "hour_cos",
    "dow_sin",
    "dow_cos",
    "aqi_roll3",
    "aqi_roll6",
    "temperature_roll3",
    "humidity_roll3",
    "pm2_5_roll3",
    "pm10_roll3",
    "aqi_trend",
    "aqi_lag1",
    "aqi_lag3",
    "aqi_lag6",
]
features = base_features + ["minutes_ahead"]

ts_arr = df["timestamp"].values
aqi_arr = df["aqi"].values

print(f"Building multi-horizon training pairs for: {HORIZONS_MINUTES} min")
rows = []
for h_min in HORIZONS_MINUTES:
    delta = np.timedelta64(h_min * 60, "s")
    matched = 0
    for i in range(len(df)):
        target_t = ts_arr[i] + delta
        diff = np.abs(ts_arr - target_t)
        idx = np.argmin(diff)
        if diff[idx] <= TARGET_TOLERANCE:
            rec = df[base_features].iloc[i].to_dict()
            rec["minutes_ahead"] = h_min
            rec["aqi_future"] = float(aqi_arr[idx])
            rec["base_timestamp"] = df["timestamp"].iloc[i]
            rec["sample_weight"] = 1.0 if df["dataSource"].iloc[i] == "real" else SYNTHETIC_WEIGHT
            rows.append(rec)
            matched += 1
    print(f"  +{h_min:3d} min -> {matched} pairs")

expanded = pd.DataFrame(rows)
expanded = expanded.dropna(subset=features + ["aqi_future", "base_timestamp"]).copy()
expanded = expanded.sort_values("base_timestamp").reset_index(drop=True)

print(f"Total training pairs: {len(expanded)}")

X = expanded[features].values
y = expanded["aqi_future"].values
w = expanded["sample_weight"].values

# Requested: proper time-based split
time_cut = expanded["base_timestamp"].iloc[int(len(expanded) * 0.8)]
train_mask = expanded["base_timestamp"] <= time_cut

X_train, X_test = X[train_mask.values], X[~train_mask.values]
y_train, y_test = y[train_mask.values], y[~train_mask.values]
w_train, w_test = w[train_mask.values], w[~train_mask.values]

print(f"Time split cutoff: {time_cut}")
print(f"Train: {len(X_train)} | Test: {len(X_test)}")

# Requested: TimeSeriesSplit validation
tscv = TimeSeriesSplit(n_splits=5)

# Requested: RandomizedSearchCV tuning
rf = RandomForestRegressor(random_state=RANDOM_STATE, n_jobs=-1)
param_dist = {
    "n_estimators": [150, 200, 300, 400, 500],
    "max_depth": [6, 8, 10, 12, 16, None],
    "min_samples_split": [2, 4, 6, 10],
    "min_samples_leaf": [1, 2, 3, 5, 8],
    "max_features": ["sqrt", 0.7, 1.0],
}

search = RandomizedSearchCV(
    estimator=rf,
    param_distributions=param_dist,
    n_iter=30,
    scoring="neg_mean_absolute_error",
    cv=tscv,
    random_state=RANDOM_STATE,
    n_jobs=-1,
    verbose=0,
)

print("Running RandomizedSearchCV...")
search.fit(X_train, y_train, sample_weight=w_train)
best_model = search.best_estimator_

print("Best params:")
for k, v in search.best_params_.items():
    print(f"  {k}: {v}")

pred = best_model.predict(X_test)
mae = mean_absolute_error(y_test, pred)
rmse = np.sqrt(mean_squared_error(y_test, pred))
r2 = r2_score(y_test, pred)
print("\nHold-out time test metrics")
print(f"  MAE : {mae:.2f}")
print(f"  RMSE: {rmse:.2f}")
print(f"  R2  : {r2:.3f}")

cv_metrics = weighted_tscv_scores(
    RandomForestRegressor(**search.best_params_, random_state=RANDOM_STATE, n_jobs=-1),
    X,
    y,
    w,
    tscv,
)
print("\nWeighted TimeSeriesSplit CV metrics")
print(f"  CV MAE : {cv_metrics['cv_mae']:.2f}")
print(f"  CV RMSE: {cv_metrics['cv_rmse']:.2f}")
print(f"  CV R2  : {cv_metrics['cv_r2']:.3f}")

# Requested: save feature importance
fi = pd.DataFrame(
    {
        "feature": features,
        "importance": best_model.feature_importances_,
    }
).sort_values("importance", ascending=False)
fi_path = os.path.join(MODEL_DIR, "aqi_feature_importance.csv")
fi.to_csv(fi_path, index=False)
print(f"Feature importance saved: {fi_path}")

interval_df = None
if ENABLE_CONFIDENCE_INTERVALS:
    # Optional confidence interval using tree prediction distribution
    tree_preds = np.array([tree.predict(X_test) for tree in best_model.estimators_])
    q10 = np.quantile(tree_preds, 0.10, axis=0)
    q90 = np.quantile(tree_preds, 0.90, axis=0)
    coverage = np.mean((y_test >= q10) & (y_test <= q90))
    print(f"Approx 80% interval coverage on test: {coverage:.3f}")

    interval_df = pd.DataFrame(
        {
            "actual": y_test,
            "pred": pred,
            "ci_low_q10": q10,
            "ci_high_q90": q90,
            "minutes_ahead": X_test[:, features.index("minutes_ahead")],
        }
    )
    ci_path = os.path.join(MODEL_DIR, "aqi_prediction_intervals_test.csv")
    interval_df.to_csv(ci_path, index=False)
    print(f"Prediction intervals saved: {ci_path}")

model_path = os.path.join(MODEL_DIR, "aqi_flexible_model.pkl")
with open(model_path, "wb") as f:
    pickle.dump(
        {
            "model": best_model,
            "features": features,
            "model_name": "Random Forest (tuned)",
            "max_minutes": 180,
            "horizons": HORIZONS_MINUTES,
            "synthetic_weight": SYNTHETIC_WEIGHT,
            "split_cutoff": str(time_cut),
            "metrics": {
                "test_mae": float(mae),
                "test_rmse": float(rmse),
                "test_r2": float(r2),
                **cv_metrics,
            },
            "confidence_interval": {
                "enabled": ENABLE_CONFIDENCE_INTERVALS,
                "quantiles": [0.10, 0.90],
            },
        },
        f,
    )
print(f"Model saved: {model_path}")

print("\nDone. Training pipeline updated with time-series-safe validation and tuning.")

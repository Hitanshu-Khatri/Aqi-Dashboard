"""
AQI 3-hour forecasting training (Ridge Regression)
Improvements included:
1) TimeSeriesSplit validation
2) Time-based train/test split
3) AQI lag and rolling features
4) Real-only training option
5) Outlier and hard-bounds filtering
6) Ridge alpha tuning
7) Coefficient importance export
"""

import os
import pickle
import warnings

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")

DATA_PATH = os.getenv(
    "AQI_TRAINING_DATA_PATH",
    r"c:\Users\Admin\AQI drone\Aqi-Dashboard\Data\aqi-data (16).csv",
)
MODEL_DIR = r"c:\Users\Admin\AQI drone\Aqi-Dashboard\Data\models"
os.makedirs(MODEL_DIR, exist_ok=True)

HORIZONS_MINUTES = [180]
TARGET_TOLERANCE = np.timedelta64(40 * 60, "s")
RANDOM_STATE = 42
USE_ONLY_REAL = True


def iqr_filter(df: pd.DataFrame, column: str, k: float = 1.5) -> pd.DataFrame:
    q1 = df[column].quantile(0.25)
    q3 = df[column].quantile(0.75)
    iqr = q3 - q1
    lo = q1 - k * iqr
    hi = q3 + k * iqr
    return df[(df[column] >= lo) & (df[column] <= hi)]


def tscv_scores(model, X, y, splitter):
    maes, rmses, r2s = [], [], []
    for train_idx, val_idx in splitter.split(X):
        model.fit(X[train_idx], y[train_idx])
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

if "dataSource" not in df.columns:
    raise ValueError("Missing required column: dataSource")

df["dataSource"] = df["dataSource"].astype(str).str.lower().str.strip()
label_counts = df["dataSource"].value_counts(dropna=False)
print(f"Loaded: {len(df)} rows")
print("Label distribution:")
print(label_counts.to_string())

if USE_ONLY_REAL:
    before_real_filter = len(df)
    df = df[df["dataSource"] == "real"].copy()
    print(
        f"Real-only filtering removed: {before_real_filter - len(df)} rows | "
        f"remaining real rows: {len(df)}"
    )

num_cols = ["aqi", "temperature", "humidity", "pm2_5", "pm10"]
df[num_cols] = df[num_cols].apply(pd.to_numeric, errors="coerce")
df = df.dropna(subset=num_cols + ["timestamp", "dataSource"]).copy()

before_hard_filter = len(df)
df = df[
    (df["aqi"] > 0)
    & (df["aqi"] <= 500)
    & (df["pm2_5"] >= 0)
    & (df["pm2_5"] <= 400)
    & (df["pm10"] >= 0)
    & (df["pm10"] <= 500)
].copy()
print(f"Hard sensor bounds removed: {before_hard_filter - len(df)} rows")

before_dedup = len(df)
df = df.drop_duplicates(subset=["timestamp"], keep="last").copy()
print(f"Duplicate timestamp rows removed: {before_dedup - len(df)}")

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
            rows.append(rec)
            matched += 1
    print(f"  +{h_min:3d} min -> {matched} pairs")

expanded = pd.DataFrame(rows)
expanded = expanded.dropna(subset=features + ["aqi_future", "base_timestamp"]).copy()
expanded = expanded.sort_values("base_timestamp").reset_index(drop=True)

print(f"Total training pairs: {len(expanded)}")

X = expanded[features].values
y = expanded["aqi_future"].values

# Time-based split
time_cut = expanded["base_timestamp"].iloc[int(len(expanded) * 0.8)]
train_mask = expanded["base_timestamp"] <= time_cut

X_train, X_test = X[train_mask.values], X[~train_mask.values]
y_train, y_test = y[train_mask.values], y[~train_mask.values]

print(f"Time split cutoff: {time_cut}")
print(f"Train: {len(X_train)} | Test: {len(X_test)}")

# TimeSeries CV + alpha tuning
base_pipe = Pipeline([
    ("scaler", StandardScaler()),
    ("ridge", Ridge(random_state=RANDOM_STATE)),
])

tscv = TimeSeriesSplit(n_splits=5)
param_grid = {
    "ridge__alpha": [0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 50.0],
}

search = GridSearchCV(
    estimator=base_pipe,
    param_grid=param_grid,
    scoring="neg_mean_absolute_error",
    cv=tscv,
    n_jobs=-1,
    verbose=0,
)

print("Running Ridge alpha tuning...")
search.fit(X_train, y_train)
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

cv_metrics = tscv_scores(
    Pipeline([
        ("scaler", StandardScaler()),
        ("ridge", Ridge(alpha=search.best_params_["ridge__alpha"], random_state=RANDOM_STATE)),
    ]),
    X,
    y,
    tscv,
)
print("\nTimeSeriesSplit CV metrics")
print(f"  CV MAE : {cv_metrics['cv_mae']:.2f}")
print(f"  CV RMSE: {cv_metrics['cv_rmse']:.2f}")
print(f"  CV R2  : {cv_metrics['cv_r2']:.3f}")

# Ridge coefficient importance (abs standardized coeffs)
ridge = best_model.named_steps["ridge"]
coef_importance = np.abs(ridge.coef_)
fi = pd.DataFrame(
    {
        "feature": features,
        "importance": coef_importance,
    }
).sort_values("importance", ascending=False)
fi_path = os.path.join(MODEL_DIR, "aqi_feature_importance.csv")
fi.to_csv(fi_path, index=False)
print(f"Coefficient importance saved: {fi_path}")

model_path = os.path.join(MODEL_DIR, "aqi_flexible_model.pkl")
with open(model_path, "wb") as f:
    pickle.dump(
        {
            "model": best_model,
            "features": features,
            "model_name": "Ridge Regression (scaled)",
            "max_minutes": 180,
            "horizons": HORIZONS_MINUTES,
            "data_path": DATA_PATH,
            "real_only": USE_ONLY_REAL,
            "split_cutoff": str(time_cut),
            "metrics": {
                "test_mae": float(mae),
                "test_rmse": float(rmse),
                "test_r2": float(r2),
                **cv_metrics,
            },
            "confidence_interval": {
                "enabled": False,
                "reason": "Ridge model has no tree distribution for quantile interval",
            },
        },
        f,
    )
print(f"Model saved: {model_path}")

print("\nDone. Ridge pipeline trained and saved.")

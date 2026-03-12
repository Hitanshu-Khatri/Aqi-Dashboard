"""
AQI prediction inference script called by Express backend.
Reads JSON on stdin and returns JSON on stdout.
"""

import json
import os
import pickle
import sys
import traceback

import numpy as np

MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "Data", "models", "aqi_flexible_model.pkl"
)


def roll_mean(values, n):
    if not values:
        return 0.0
    window = values[-n:] if len(values) >= n else values
    return float(np.mean(window))


def lag_value(values, lag):
    # lag=1 means previous point; fallback to latest if history is short
    idx = -(lag + 1)
    if len(values) >= lag + 1:
        return float(values[idx])
    return float(values[-1]) if values else 0.0


try:
    payload = json.loads(sys.stdin.read() or "{}")

    aqi = float(payload["aqi"])
    temperature = float(payload["temperature"])
    humidity = float(payload["humidity"])
    pm2_5 = float(payload["pm2_5"])
    pm10 = float(payload["pm10"])
    minutes_ahead = float(payload["minutesAhead"])
    hour = int(payload.get("hour", 12))
    dow = int(payload.get("dow", 0))

    recent_aqi = [float(v) for v in payload.get("recentAqi", [aqi])]
    if not recent_aqi:
        recent_aqi = [aqi]

    with open(MODEL_PATH, "rb") as f:
        saved = pickle.load(f)

    model = saved["model"]
    model_name = saved.get("model_name", "Random Forest")
    features = saved["features"]

    hour_sin = np.sin(2 * np.pi * hour / 24)
    hour_cos = np.cos(2 * np.pi * hour / 24)
    dow_sin = np.sin(2 * np.pi * dow / 7)
    dow_cos = np.cos(2 * np.pi * dow / 7)

    feature_map = {
        "aqi": aqi,
        "temperature": temperature,
        "humidity": humidity,
        "pm2_5": pm2_5,
        "pm10": pm10,
        "hour_sin": float(hour_sin),
        "hour_cos": float(hour_cos),
        "dow_sin": float(dow_sin),
        "dow_cos": float(dow_cos),
        "aqi_roll3": roll_mean(recent_aqi, 3),
        "aqi_roll6": roll_mean(recent_aqi, 6),
        "aqi_roll12": roll_mean(recent_aqi, 12),
        "temperature_roll3": temperature,
        "humidity_roll3": humidity,
        "pm2_5_roll3": pm2_5,
        "pm10_roll3": pm10,
        "aqi_trend": float(recent_aqi[-1] - recent_aqi[-4]) if len(recent_aqi) >= 4 else 0.0,
        "aqi_lag1": lag_value(recent_aqi, 1),
        "aqi_lag3": lag_value(recent_aqi, 3),
        "aqi_lag6": lag_value(recent_aqi, 6),
        "minutes_ahead": minutes_ahead,
    }

    row = [float(feature_map.get(name, 0.0)) for name in features]
    X = np.array([row])

    pred = float(model.predict(X)[0])
    pred = max(0.0, min(500.0, pred))

    result = {
        "prediction": round(pred, 1),
        "model": model_name,
        "minutesAhead": int(minutes_ahead),
    }

    # Optional CI if the model is a RandomForest with tree estimators
    if hasattr(model, "estimators_"):
        tree_preds = np.array([tree.predict(X)[0] for tree in model.estimators_], dtype=float)
        ci_low = float(np.quantile(tree_preds, 0.10))
        ci_high = float(np.quantile(tree_preds, 0.90))
        result["ciLowQ10"] = round(max(0.0, min(500.0, ci_low)), 1)
        result["ciHighQ90"] = round(max(0.0, min(500.0, ci_high)), 1)

    print(json.dumps(result))
    sys.exit(0)

except Exception as exc:
    print(json.dumps({"error": str(exc), "trace": traceback.format_exc()}))
    sys.exit(1)

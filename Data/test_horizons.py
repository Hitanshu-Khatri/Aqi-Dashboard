"""
AQI model comparison script for documentation visuals.

Trains 7 regressors on the latest Ridge dataset and produces:
1) MAE comparison bar chart
2) Actual vs predicted scatter (Ridge)
3) Residual histogram (Ridge)
4) Top-10 Ridge coefficient importance chart
5) Composite score comparison chart
"""

import warnings

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Lasso, LinearRegression, Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, cross_val_score, train_test_split
from sklearn.neighbors import KNeighborsRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVR

warnings.filterwarnings("ignore")

DATA_PATH = r"c:\Users\Admin\AQI drone\Aqi-Dashboard\Data\aqi-data (16).csv"
RANDOM_STATE = 42


def clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def website_composite_score(test_mae: float, test_r2: float, cv_mae: float) -> float:
    """Match backend/predict.py scoring logic exactly."""
    mae_score = clamp(100.0 - (test_mae * 2.0), 0.0, 100.0)
    r2_score_pct = clamp(((test_r2 + 1.0) / 2.0) * 100.0, 0.0, 100.0)
    stability_score = clamp(100.0 - (abs(test_mae - cv_mae) * 3.0), 0.0, 100.0)
    return round(0.50 * mae_score + 0.35 * r2_score_pct + 0.15 * stability_score, 1)


def prepare_data(csv_path: str):
    """Load, clean, and engineer features for AQI prediction."""
    df = pd.read_csv(csv_path)

    # Keep only real rows to match the active Ridge training setup.
    if "dataSource" in df.columns:
        df["dataSource"] = df["dataSource"].astype(str).str.lower().str.strip()
        df = df[df["dataSource"] == "real"].copy()

    df["timestamp"] = pd.to_datetime(df["timestamp"], format="mixed", utc=True)
    df = df.sort_values("timestamp").reset_index(drop=True)

    numeric_cols = ["aqi", "temperature", "humidity", "pm2_5", "pm10"]
    df[numeric_cols] = df[numeric_cols].apply(pd.to_numeric, errors="coerce")
    df = df.dropna(subset=numeric_cols + ["timestamp"]).copy()

    # Basic physical bounds cleanup.
    df = df[
        (df["aqi"] > 0)
        & (df["aqi"] <= 500)
        & (df["pm2_5"] >= 0)
        & (df["pm2_5"] <= 400)
        & (df["pm10"] >= 0)
        & (df["pm10"] <= 500)
    ].copy()

    # Time-based engineered features.
    df["hour"] = df["timestamp"].dt.hour
    df["dow"] = df["timestamp"].dt.dayofweek
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
    df["dow_sin"] = np.sin(2 * np.pi * df["dow"] / 7)
    df["dow_cos"] = np.cos(2 * np.pi * df["dow"] / 7)

    # Rolling features from non-target sensor columns.
    for col in ["temperature", "humidity", "pm2_5", "pm10"]:
        df[f"{col}_roll3"] = df[col].rolling(3, min_periods=1).mean()
        df[f"{col}_roll6"] = df[col].rolling(6, min_periods=1).mean()

    feature_cols = [
        "temperature",
        "humidity",
        "pm2_5",
        "pm10",
        "hour_sin",
        "hour_cos",
        "dow_sin",
        "dow_cos",
        "temperature_roll3",
        "temperature_roll6",
        "humidity_roll3",
        "humidity_roll6",
        "pm2_5_roll3",
        "pm2_5_roll6",
        "pm10_roll3",
        "pm10_roll6",
    ]

    model_df = df.dropna(subset=feature_cols + ["aqi"]).copy()
    X = model_df[feature_cols]
    y = model_df["aqi"]
    return X, y, feature_cols


def get_models():
    """Return required model dictionary with scaling where needed."""
    return {
        "Linear Regression": LinearRegression(),
        "Ridge Regression": Pipeline(
            [("scaler", StandardScaler()), ("ridge", Ridge(alpha=10.0, random_state=RANDOM_STATE))]
        ),
        "Lasso Regression": Pipeline(
            [("scaler", StandardScaler()), ("lasso", Lasso(alpha=0.01, random_state=RANDOM_STATE, max_iter=5000))]
        ),
        "KNN Regressor": Pipeline(
            [("scaler", StandardScaler()), ("knn", KNeighborsRegressor(n_neighbors=12, weights="distance"))]
        ),
        "Random Forest Regressor": RandomForestRegressor(
            n_estimators=250, random_state=RANDOM_STATE, n_jobs=-1
        ),
        "Gradient Boosting Regressor": GradientBoostingRegressor(random_state=RANDOM_STATE),
        "SVR": Pipeline(
            [("scaler", StandardScaler()), ("svr", SVR(C=20.0, epsilon=0.2, gamma="scale"))]
        ),
    }


def evaluate_models(models, X_train, X_test, y_train, y_test):
    """Train/evaluate all models and return metrics + predictions."""
    results = []
    predictions = {}
    fitted_models = {}

    for model_name, model in models.items():
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)
        kf = KFold(n_splits=5, shuffle=False)
        cv_mae = -cross_val_score(
            model,
            X_train,
            y_train,
            cv=kf,
            scoring="neg_mean_absolute_error",
            n_jobs=None,
        ).mean()
        composite_score = website_composite_score(mae, r2, cv_mae)

        results.append(
            {
                "Model": model_name,
                "MAE": mae,
                "RMSE": rmse,
                "R2": r2,
                "CV_MAE": cv_mae,
                "CompositeScore": composite_score,
            }
        )
        predictions[model_name] = y_pred
        fitted_models[model_name] = model

    results_df = pd.DataFrame(results).sort_values("MAE").reset_index(drop=True)
    return results_df, predictions, fitted_models


def plot_mae_comparison(results_df):
    plt.figure(figsize=(12, 6))
    colors = ["green" if m == "Ridge Regression" else "steelblue" for m in results_df["Model"]]
    plt.bar(results_df["Model"], results_df["MAE"], color=colors)
    plt.xticks(rotation=30, ha="right")
    plt.ylabel("MAE")
    plt.xlabel("Model")
    plt.title("MAE Comparison of Machine Learning Models")
    plt.tight_layout()
    plt.show()


def plot_actual_vs_predicted(y_test, ridge_pred):
    plt.figure(figsize=(8, 6))
    plt.scatter(y_test, ridge_pred, alpha=0.6, color="green", edgecolors="black", linewidths=0.3)
    lo = min(float(np.min(y_test)), float(np.min(ridge_pred)))
    hi = max(float(np.max(y_test)), float(np.max(ridge_pred)))
    plt.plot([lo, hi], [lo, hi], "r--", linewidth=2)
    plt.xlabel("Actual AQI")
    plt.ylabel("Predicted AQI")
    plt.title("Actual vs Predicted AQI (Ridge Regression)")
    plt.tight_layout()
    plt.show()


def plot_residual_distribution(y_test, ridge_pred):
    residuals = y_test - ridge_pred
    plt.figure(figsize=(9, 5))
    plt.hist(residuals, bins=30, color="green", alpha=0.75, edgecolor="black")
    plt.xlabel("Residual (Actual - Predicted)")
    plt.ylabel("Frequency")
    plt.title("Residual Distribution (Ridge Regression)")
    plt.tight_layout()
    plt.show()


def plot_ridge_feature_importance(ridge_model, feature_cols):
    ridge_est = ridge_model.named_steps["ridge"]
    coef = np.abs(ridge_est.coef_)
    importance_df = pd.DataFrame({"Feature": feature_cols, "AbsCoefficient": coef})
    top10 = importance_df.sort_values("AbsCoefficient", ascending=False).head(10)

    plt.figure(figsize=(10, 6))
    plt.barh(top10["Feature"], top10["AbsCoefficient"], color="green")
    plt.gca().invert_yaxis()
    plt.xlabel("Absolute Coefficient Value")
    plt.ylabel("Feature")
    plt.title("Top 10 Important Features (Ridge Regression)")
    plt.tight_layout()
    plt.show()


def plot_composite_scores(results_df):
    plt.figure(figsize=(12, 6))
    colors = ["green" if m == "Ridge Regression" else "slategray" for m in results_df["Model"]]
    plt.bar(results_df["Model"], results_df["CompositeScore"], color=colors)
    plt.xticks(rotation=30, ha="right")
    plt.ylabel("Score = (1 / MAE) + R2")
    plt.xlabel("Model")
    plt.title("Composite Model Performance Score")
    plt.tight_layout()
    plt.show()


def main():
    X, y, feature_cols = prepare_data(DATA_PATH)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE
    )

    models = get_models()
    results_df, predictions, fitted_models = evaluate_models(models, X_train, X_test, y_train, y_test)

    print("\nModel Comparison Results:\n")
    print(results_df.to_string(index=False, justify="center", float_format=lambda v: f"{v:.4f}"))

    # Required figures
    plot_mae_comparison(results_df)
    plot_actual_vs_predicted(y_test, predictions["Ridge Regression"])
    plot_residual_distribution(y_test, predictions["Ridge Regression"])
    plot_ridge_feature_importance(fitted_models["Ridge Regression"], feature_cols)
    plot_composite_scores(results_df)


if __name__ == "__main__":
    main()

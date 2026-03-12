import pandas as pd, numpy as np, warnings
warnings.filterwarnings('ignore')
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import KFold, cross_val_score

df = pd.read_csv(r'c:\Users\Admin\AQI drone\Aqi-Dashboard\Data\aqi_expanded_800.csv')
df['timestamp'] = pd.to_datetime(df['timestamp'], format='mixed', utc=True)
df = df.sort_values('timestamp').reset_index(drop=True)
cols = ['aqi','temperature','humidity','pm2_5','pm10']
df[cols] = df[cols].apply(pd.to_numeric, errors='coerce')
df['hour'] = df['timestamp'].dt.hour
df['dow']  = df['timestamp'].dt.dayofweek
df['hour_sin'] = np.sin(2*np.pi*df['hour']/24)
df['hour_cos'] = np.cos(2*np.pi*df['hour']/24)
df['dow_sin']  = np.sin(2*np.pi*df['dow']/7)
df['dow_cos']  = np.cos(2*np.pi*df['dow']/7)
for col in cols:
    df[f'{col}_roll3']  = df[col].rolling(3,  min_periods=1).mean()
    df[f'{col}_roll6']  = df[col].rolling(6,  min_periods=1).mean()
    df[f'{col}_roll12'] = df[col].rolling(12, min_periods=1).mean()
df['aqi_trend'] = df['aqi'] - df['aqi'].shift(3).fillna(df['aqi'])

FEATURES = ['aqi','temperature','humidity','pm2_5','pm10',
            'hour_sin','hour_cos','dow_sin','dow_cos',
            'aqi_roll3','aqi_roll6','aqi_roll12',
            'temperature_roll3','humidity_roll3',
            'pm2_5_roll3','pm10_roll3','aqi_trend']

ts_arr  = df['timestamp'].values
aqi_arr = df['aqi'].values
tol     = np.timedelta64(45*60,'s')

print("="*65)
print("  PREDICTION HORIZON TEST  (Random Forest, 800 rows)")
print("="*65)
print(f"  {'Horizon':>8}  {'Pairs':>6}  {'MAE':>6}  {'CV MAE':>7}  {'R2':>6}  Verdict")
print(f"  {'-'*57}")

best_h, best_mae = 6, 9999
for h in [1, 2, 3, 6, 12]:
    delta = np.timedelta64(h*3600,'s')
    fut = []
    for i in range(len(df)):
        diff = np.abs(ts_arr - (ts_arr[i] + delta))
        idx  = np.argmin(diff)
        fut.append(aqi_arr[idx] if diff[idx] <= tol else np.nan)
    df[f'aqi_{h}h'] = fut

    sub = df[FEATURES + [f'aqi_{h}h']].dropna()
    if len(sub) < 20:
        print(f"  +{h}h      |{len(sub):>6}  |   N/A  |    N/A  |   N/A  | Not enough data")
        continue

    X = sub[FEATURES].values
    y = sub[f'aqi_{h}h'].values
    split = int(len(X) * 0.8)

    m = RandomForestRegressor(n_estimators=150, max_depth=10,
                              min_samples_leaf=5, random_state=42)
    m.fit(X[:split], y[:split])
    yp      = m.predict(X[split:])
    mae     = mean_absolute_error(y[split:], yp)
    r2      = r2_score(y[split:], yp)
    kf      = KFold(n_splits=5, shuffle=False)
    cv_mae  = -cross_val_score(m, X, y, cv=kf,
                scoring='neg_mean_absolute_error').mean()

    if   mae < 4:  verdict = "<< EXCELLENT"
    elif mae < 6:  verdict = "<< GREAT"
    elif mae < 9:  verdict = "Good"
    elif mae < 13: verdict = "OK"
    else:          verdict = "Weak"

    print(f"  +{h}h      {len(sub):>6}  {mae:>6.2f}  {cv_mae:>7.2f}  {r2:>6.3f}  {verdict}")
    if mae < best_mae:
        best_mae = mae
        best_h   = h

print("="*65)
print(f"  RECOMMENDATION: Use +{best_h}h prediction (MAE = {best_mae:.2f})")
print("="*65)

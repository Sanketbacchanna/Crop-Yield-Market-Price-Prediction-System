## 🌾 Crop Yield & Market Price Prediction Portal

An intelligent agriculture decision-support system designed to help farmers make informed crop-selection decisions using machine learning, agricultural data, weather information, and market-price information.

## 📌 Project Overview

The **Crop Yield & Market Price Prediction Portal** aims to help farmers understand the expected yield of crops and compare available market-price forecasts before deciding which crops to cultivate.

The system combines crop-yield prediction, agricultural information, weather data, and price-based crop recommendation logic to support data-driven agricultural planning.

## 🎯 Objectives

- Predict crop yield using a trained machine-learning model.
- Store and manage agricultural and crop-related information.
- Incorporate weather and soil data into agricultural decision support.
- Store market-price forecast records for different crops.
- Recommend suitable crop options based on predicted yield and available forecast prices.
- Maintain prediction records for future reference.

## ✨ Features

**Multi-user accounts and access**

- Farmers can create accounts, manage a profile and region, and keep private farm, crop-history, and prediction records.
- Admins can assign farmer, regional-admin, or admin roles. Regional admins can view farmer accounts in their assigned region.
- Sign-in and sign-up use animated responsive forms. Forgot-password requests send a time-limited reset link through configured SMTP.
- Prediction and crop-history APIs return only the authenticated user’s records.

**1. Crop Yield Prediction**

- Uses a trained machine-learning model saved as yield_model.pkl.

- Uses agricultural information to support yield prediction.

- Includes a crop-yield dataset for model development.

- Automatically selects the supported Karnataka district matching the farmer's live location; the district can still be changed manually.

**2. Crop Recommendation**

- Retrieves agricultural information such as district, season, and cultivated area.

- Evaluates candidate crops using predicted yield and available price records.

- Calculates a normalized recommendation score using a 50% yield and 50% price weighting.

- Ranks candidate crops according to the calculated score.

**3. Market-Price Record Management**

- Stores crop-price forecast records in MySQL.

- Associates records with users and crops.

- Stores the forecast price, model name, and forecast date.

- Retrieves the latest available price record for a given user and crop.

**Current limitation:** Market forecasts use recent prices supplied by the user; the portal does not yet ingest live market prices.

**4. Weather Data**

- Includes a Karnataka weather dataset covering 2015–2026.

- Provides weather information that can support future improvements to crop prediction and recommendations.

- Shows a location-specific 7-day forecast, 30-day ensemble rainfall outlook, and six-month seasonal rainfall outlook.

- Compares weekly and monthly rainfall forecasts with the provider's model climatology and surfaces heuristic dry-spell and heavy-rain signals.

- Weather outlooks use Open-Meteo data. Rainfall signals are informational only, not official drought or flood warnings.

**5. Soil Data**

- Includes a soil dataset for agricultural analysis and future crop-suitability improvements.

**6. REST API**

- Built with FastAPI.

- Uses SQLAlchemy to interact with the database.

- Provides API endpoints for prediction-related operations.

- Supports interactive API testing through Swagger UI.

## 🛠️ Technology Stack

**Component & Technology**

- Backend: Python, FastAPI
- Machine Learning: scikit-learn / compatible Python ML pipeline
- Database: MySQL
- ORM: SQLAlchemy
- API Testing: Swagger UI
- Yield Model: yield_model.pkl
- Data Processing: Pandas
- Weather Data: Karnataka weather CSV dataset
- Development Environment: Python virtual environment


## ⚙️ Prerequisites

Install or configure the following:

Python 3.11 or another version compatible with your installed dependencies.

MySQL Server.

Visual Studio Code or another Python IDE.

Git (optional, for version control).

## 🚀 Installation and Setup

**Step 1: Clone the Repository**

If your project is hosted on GitHub:

git clone <YOUR_GITHUB_REPOSITORY_URL>
cd crop-prediction-portal

Alternatively, open your existing project directory.

**Step 2: Create and Activate a Virtual Environment**

On Windows PowerShell:

**python -m venv .venv
.\.venv\Scripts\Activate.ps1**

**Step 3: Install Dependencies**

If you have a requirements.txt file:

**pip install -r backend/requirements.txt**

Use the actual location of your requirements file if it is stored elsewhere.

**Step 4: Configure MySQL**

Create the project database in MySQL:

**CREATE DATABASE crop_yield;**

Copy `backend/.env.example` to `backend/.env` and set your database credentials.
The backend requires `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`;
`DB_PORT` defaults to `3306`. Set `CORS_ORIGINS` to a comma-separated list
of trusted frontend origins (the defaults are `http://localhost:5173` and
`http://127.0.0.1:5173`).
Never commit `backend/.env` or put real credentials in `.env.example`.

The repository previously tracked `backend/.env`; it is now ignored. Remove
it from Git tracking while keeping your local copy with:

```powershell
git rm --cached backend/.env
```

If real credentials were ever committed, rotate them; ignoring the file does
not remove values from the repository's existing history.

For an existing database, run the additive auth-column migration once from
the `backend` directory:

```powershell
python migrate_user_lifecycle.py
```

The migration adds auth lifecycle and region columns and creates the crop
history table. It is safe to rerun and preserves existing user data.

Configure password reset email delivery in `backend/.env` before enabling
forgot-password requests:

```text
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=AgriPredict <noreply@example.com>
SMTP_USE_TLS=true
FRONTEND_BASE_URL=http://localhost:5173
```

Only trusted operators should grant the first administrator role. After
registering the intended account, promote it directly in the database, then
use Settings & Profile to manage roles:

```sql
UPDATE user_table SET role = 'admin' WHERE email = 'admin@example.com';
```

Public registration always creates a farmer account. Administrator and
regional-admin privileges cannot be self-selected.

For farmer farm profiles, create the new account-owned farm table from the
`backend` directory:

```powershell
python migrate_farm_profiles.py
```

The migration is safe to rerun. After it completes, sign in and open
**Settings & Profile** to create, edit, or remove farm profiles.

**Step 5: Start the Backend**

From the project root in PowerShell:

**$env:PYTHONPATH = "$PWD\backend"
python -m uvicorn app.main:app --reload --app-dir backend**

If your current project setup already uses a different working directory or startup command, follow that configuration.

**Step 6: Open the API Documentation**

After the server starts, open:

**Swagger UI:** http://127.0.0.1:8000/docs

**OpenAPI JSON:** http://127.0.0.1:8000/openapi.json

Use Swagger UI to explore the registered endpoints and test supported requests.

## 🔌 API Modules

The following modules have been identified in the project:

## Module  Purpose

Price Prediction: Saves and retrieves market-price forecast records

Crop Recommendation: Selects and ranks candidate crops using yield and price information

Yield Prediction: Uses the trained yield model for yield-related predictions

The exact endpoints and parameters depend on the routes registered in **app/main.py.**

**Example: Save a Price Record**

**POST /price-prediction/**

Example query parameters:

- user_id=1
- crop_id=1
- forecast_price=2800
- model_used=Random Forest
- forecast_date=2026-10-10

This endpoint stores the supplied values. The example is illustrative and does not represent a verified market forecast.

**Example: Retrieve Price Records**

**GET /price-prediction/**

Returns the stored price-prediction records available through the endpoint.

**Example: Generate Crop Recommendations**

**GET /crop-recommendation/recommend?user_id=1&agricultural_id=3**

This example uses an existing project route. A successful recommendation requires suitable candidate crops and matching saved price records.

## 🗄️ Database

The project uses MySQL to manage agricultural and prediction information.

The database tables identified during development include:

**user_table**

**crop_table**

**agricultural_data_table**

**market_price_table**

**- price_prediction_table**

**crop_recommendation_table**

**yield_prediction_table**

**weather_data_table**

The exact columns and relationships are defined by the database schema and SQLAlchemy models.

## 🤖 Machine Learning

Yield and price use separate training pipelines and separately versioned models.
Each pipeline engineers features inside the saved scikit-learn pipeline, compares
RandomForest, XGBoost, LightGBM, and CatBoost, selects by cross-validation RMSE,
and reports a chronological 80/20 holdout. Price cross-validation uses expanding
date windows. The yield dataset currently contains only three crop years, so its
final holdout is chronological while cross-validation falls back to grouped
district/crop/season folds; this constraint is recorded in its metadata.

Install training dependencies and train from the repository root in PowerShell:

```powershell
python -m pip install -r ml/requirements.txt
python ml\train_yield.py
python ml\train_price.py
```

MLflow tracks parameters, per-model validation metrics, the selected model, and
the exact dataset snapshot. By default, run metadata is stored in
`ml/mlflow.db` and MLflow artifacts in `ml/mlartifacts`; set
`MLFLOW_TRACKING_URI` to use a shared tracking server. Start the local UI with:

```powershell
mlflow ui --backend-store-uri sqlite:///ml/mlflow.db
```

Every successful run creates a version directory under `ml/artifacts/<task>/`
containing `model.joblib`, `metadata.json`, `comparison.json`, and a byte-for-byte
copy of the source dataset. Metadata records the SHA-256 dataset hash, model and
metadata schema versions, package versions, date split, cross-validation method,
metrics, and MLflow run ID. A latest-model pointer is updated only after the
MLflow run succeeds; the API verifies the model and dataset bundle when loading
it, and continues to support the original model files until a versioned run is
created.

Generated bundles, latest pointers, and MLflow stores are local outputs and are
git-ignored. Preserve or deploy the version directory and its matching latest
pointer together when promoting a trained model.

## 🌱 Farmer Business Features

- **Crop calendar and field tasks:** General Karnataka month-by-month planning
  prompts plus personal tasks saved in the browser for offline access. Confirm
  crop-specific timing with the local KVK or agriculture office.
- **Personalized crop recommendations:** Uses the selected district, season,
  soil, and yield estimate. When every compared crop has a price forecast saved
  by the signed-in farmer, the ranking combines normalized yield and price
  scores; otherwise ranking uses yield alone and labels missing price data.
- **Historical price trends:** Monthly modal-price charts from
  `prepared_crop_price_data.csv`, filterable by crop.
- **District yield history:** Area-weighted crop yields from the bundled
  Karnataka yield dataset; filter by district, crop, and season. Available
  years and observations are shown with the report.
- **Reports:** Download Excel-compatible CSV reports, use the browser's print
  dialog to save reports or the calendar as PDF, and save up to ten report
  snapshots locally per account. Share uses the browser's native share sheet
  or copies a short report summary.
- **Interface preferences:** Dashboard cards show loading states, insights
  adapt to mobile screens, and the light/dark theme preference is saved in the
  browser.
- **Government resources:** Scheme/service suggestions link directly to official
  Government of India and Karnataka portals. They are informational, do not
  determine eligibility, and do not submit applications.
- **Offline field use:** The production service worker caches the application
  shell and static assets, while calendar tasks and a user-scoped crop-history
  cache/draft queue are stored on the current device. Pending crop-history
  records sync when the app is online and the same user signs in. API
  responses—including authentication and private profile data—are not cached by
  the service worker. Predictions, live weather, and government websites still
  require a connection.

The bundled price and yield histories are finite historical datasets, not live
market quotes or current farm observations. Check dates shown in reports before
making business decisions.

## 📊 Recommendation Method

Each score is normalized against the candidate crops being compared. If
price forecasts exist for all candidates, the score is 50% normalized yield and
50% normalized farmer-specific forecast price. If any candidate lacks a saved
price forecast, recommendations remain available and ranking is based on
normalized yield; the response and UI indicate this basis.

This score does not directly represent profit. Future versions could include cultivation cost, expected production, weather risks, and transportation costs to estimate profitability more realistically.

## 🔒 Security Considerations

- Do not upload API keys, database passwords, or secret tokens to GitHub.

- Use environment variables for sensitive configuration.

- Validate API input parameters.

- Restrict access to user-specific prediction records.

- Use appropriate authentication and authorization before deploying the application publicly.

- Treat stored prices as forecasts only when their source and generation method are documented.

## 🔮 Future Enhancements

- Automated market-price forecasting using historical market data.

- Integration with a verified agricultural market-price API.

- Crop profitability estimation.

- Improved crop suitability analysis using soil and weather conditions.

- Weather-based crop recommendations.

- Multilingual support for farmers.

- Prediction history and dashboard visualizations.

- User authentication and role-based access control.

- Model evaluation, monitoring, and periodic retraining.

## 🎓 Academic Project

This project demonstrates the application of machine learning, agricultural datasets, REST API development, database management, and decision-support logic to an agricultural use case.

## 👨‍💻 Author

**Sanket Bacchanna**

MCA Student | Full Stack Developer

GitHub: Sanketbacchanna

Project status: Crop-yield model and crop-recommendation logic are present. Automated market-price forecasting remains a planned enhancement.

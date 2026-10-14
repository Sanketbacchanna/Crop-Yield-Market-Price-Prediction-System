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

**1. Crop Yield Prediction**

- Uses a trained machine-learning model saved as yield_model.pkl.

- Uses agricultural information to support yield prediction.

- Includes a crop-yield dataset for model development.

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

**Current limitation:** The existing price-prediction API saves price values supplied to it. Automated market-price forecasting still requires a suitable historical price dataset and a trained forecasting model.

**4. Weather Data**

- Includes a Karnataka weather dataset covering 2015–2026.

- Provides weather information that can support future improvements to crop prediction and recommendations.

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

## 📂 Project Structure

crop-prediction-portal/
│
├── backend/
│   └── app/
│       ├── main.py
│       ├── database.py
│       ├── models/
│       │   ├── price_prediction.py
│       │   └── ...
│       └── routers/
│           ├── price_prediction.py
│           ├── crop_recommendation.py
│           └── ...
│
├── ml/
│   ├── datasets/
│   │   ├── Crop_Yield.csv
│   │   ├── Crop_Yield_backup.csv
│   │   ├── Crop_Yield_Cleaned.csv
│   │   ├── karnataka_weather_2015_2026.csv
│   │   └── Soil data.csv
│   │
│   └── saved_models/
│       └── yield_model.pkl
│
├── .venv/
└── README.md

Note: This structure highlights the main files identified during development. Your actual project may contain additional modules and files.

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

Configure your database connection using the settings expected by 
**backend/app/database.py.**

Keep database passwords and other credentials in environment variables or a local configuration file excluded from Git. Do not commit API keys or passwords.

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

**- user_table**

**- crop_table**

**- agricultural_data_table**

**- market_price_table**

**- price_prediction_table**

**- crop_recommendation_table**

**- yield_prediction_table**

**- weather_data_table**

The exact columns and relationships are defined by the database schema and SQLAlchemy models.

## 🤖 Machine Learning

Crop Yield Model

The current trained model is stored at:

**ml/saved_models/yield_model.pkl**

The crop-yield dataset includes information such as:

- State and district

- Crop

- Crop year

- Season

- Area and area unit

- Production unit and production

- Yield

The existing model is intended for crop-yield prediction. It should not be used to predict market prices because yield and price are different prediction targets.

**Market-Price Forecasting — Planned Improvement**

The following work is still required to implement automated price forecasting:

1.Obtain reliable historical crop market prices.

2.Clean and validate the data.

3.Select suitable input features and a forecast target.

4.Train and evaluate a separate price-prediction model.

5.Save the trained model.

6.Generate price forecasts through a dedicated API endpoint.

7.Store generated forecasts in **price_prediction_table.**

8.Integrate those forecasts into crop recommendation.

## 📊 Recommendation Method

The current recommendation logic combines normalized yield and price scores:

**Recommendation score = 0.5 × Yield score + 0.5 × Price score**

Each score is normalized relative to the candidate crops being compared. A higher score indicates a better ranking under this formula.

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

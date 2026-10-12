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

Uses a trained machine-learning model saved as yield_model.pkl.

Uses agricultural information to support yield prediction.

Includes a crop-yield dataset for model development.

**2. Crop Recommendation**

Retrieves agricultural information such as district, season, and cultivated area.

Evaluates candidate crops using predicted yield and available price records.

Calculates a normalized recommendation score using a 50% yield and 50% price weighting.

Ranks candidate crops according to the calculated score.

**3. Market-Price Record Management**

Stores crop-price forecast records in MySQL.

Associates records with users and crops.

Stores the forecast price, model name, and forecast date.

Retrieves the latest available price record for a given user and crop.

Current limitation: The existing price-prediction API saves price values supplied to it. Automated market-price forecasting still requires a suitable historical price dataset and a trained forecasting model.

**4. Weather Data**

Includes a Karnataka weather dataset covering 2015–2026.

Provides weather information that can support future improvements to crop prediction and recommendations.

**5. Soil Data**

Includes a soil dataset for agricultural analysis and future crop-suitability improvements.

**6. REST API**

Built with FastAPI.

Uses SQLAlchemy to interact with the database.

Provides API endpoints for prediction-related operations.

Supports interactive API testing through Swagger UI.

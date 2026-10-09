# 🌾 Crop Yield & Market Price Prediction Portal

An intelligent agriculture decision-support system that helps farmers make better crop planning decisions using **Machine Learning, weather data, agricultural data, market price forecasting, and crop recommendation**.

The system predicts crop yield, provides market price forecasts, and recommends suitable crops based on predicted yield and expected market price.

---

## 📌 Project Overview

Agriculture depends on several factors such as:

- Crop type
- Location
- Season
- Cultivated area
- Soil type
- Weather conditions
- Historical crop yield
- Market prices

This project combines these factors into a single web-based platform.

The system provides:

1. 👨‍🌾 Farmer/User Management
2. 🌱 Crop and Agricultural Data Management
3. 🌾 Crop Yield Prediction
4. 💰 Market Price Prediction
5. 🌦️ Weather Data Integration
6. 🌱 Crop Recommendation
7. 📊 Prediction History and Reports

---

## 🎯 Objectives

The main objectives of this project are:

- Predict expected crop yield using Machine Learning.
- Forecast crop market prices.
- Use weather and agricultural information for better predictions.
- Recommend suitable crops to farmers.
- Store prediction results in MySQL.
- Provide APIs for integration with a frontend application.
- Help farmers make data-driven agricultural decisions.

---

## 🚀 Main Features
1. 👤 User Management

Farmers can be registered and their information can be stored in the database.

User information is associated with:

- User ID
- Personal information
- Agricultural records
- Predictions
- Recommendations

---

2. 🌱 Crop Management

The system maintains crop information such as:

Crop ID
Crop Name
Crop Type
Season
Soil Type

Example:

Crop ID: 1
Crop Name: Rice
Crop Type: Cereal
Season: Kharif
Soil Type: Clayey
3. 🌾 Agricultural Data

Agricultural information is stored for each farming record.

Example:

State: Karnataka
District: Bidar
Season: Kharif
Crop: Rice
Cultivated Area: 5 Hectares
Soil Type: Clayey
Crop Year: 2001-02

This information is used as input for Machine Learning predictions.
## 🏗️ System Architecture

```text
                         ┌──────────────────────┐
                         │      Farmer/User     │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    Frontend/UI       │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │     FastAPI Backend  │
                         └──────────┬───────────┘
                                    │
             ┌──────────────────────┼──────────────────────┐
             │                      │                      │
             ▼                      ▼                      ▼
      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
      │ Yield Model  │      │ Price Model  │      │ Weather API  │
      │ Random Forest│      │ / Forecast   │      │ / Dataset    │
      └──────┬───────┘      └──────┬───────┘      └──────┬───────┘
             │                      │                      │
             └──────────────────────┼──────────────────────┘
                                    ▼
                         ┌──────────────────────┐
                         │ Crop Recommendation  │
                         │       Engine          │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │       MySQL DB       │
                         └──────────────────────┘

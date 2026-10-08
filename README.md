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


---






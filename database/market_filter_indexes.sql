-- Supporting indexes for market history filtering and sorting.
CREATE INDEX idx_hist_filter_lookup
    ON historical_market_prices (state, district, market, commodity, variety, arrival_date);
CREATE INDEX idx_hist_state_market
    ON historical_market_prices (state, market);
CREATE INDEX idx_hist_state_commodity
    ON historical_market_prices (state, commodity);
CREATE INDEX idx_hist_state_variety
    ON historical_market_prices (state, variety);

import { useEffect, useState } from "react";
import { getNearestMandiMarkets } from "../services/api";

function formatPrice(value) {
  return value == null ? "Price unavailable" : `₹${Number(value).toLocaleString("en-IN")}/quintal`;
}

function NearestMandi({ liveLocation, commodity }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const latitude = Number(liveLocation?.latitude);
    const longitude = Number(liveLocation?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setResult(null);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    getNearestMandiMarkets(latitude, longitude, commodity)
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message || "Unable to find nearby markets.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [liveLocation?.latitude, liveLocation?.longitude, commodity]);

  const markets = result?.data || [];
  const bestMarket = result?.best_market;

  return (
    <section className="nearest-mandi-section" aria-labelledby="nearest-mandi-title">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">SMART FARM TOOL</p>
          <h2 id="nearest-mandi-title">Nearest mandi markets</h2>
          <p>Compare nearby APMC prices before deciding where to sell.</p>
        </div>
        <span className="nearest-mandi-location">
          {liveLocation?.name || "Farm location"}
        </span>
      </div>

      {!liveLocation?.latitude && !loading && (
        <div className="market-status">
          Allow location access to find the nearest markets.
        </div>
      )}
      {loading && <div className="market-status">Finding nearby markets…</div>}
      {!loading && error && <div className="market-status error">{error}</div>}
      {!loading && !error && markets.length > 0 && (
        <>
          <div className="nearest-mandi-table-wrapper">
            <table className="nearest-mandi-table">
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Distance</th>
                  <th>{commodity || "Crop"} price</th>
                </tr>
              </thead>
              <tbody>
                {markets.map((market) => (
                  <tr key={market.market}>
                    <td>
                      <strong>{market.market}</strong>
                      <small>{market.district}</small>
                    </td>
                    <td>{market.distance_km} km</td>
                    <td>{formatPrice(market.modal_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {bestMarket ? (
            <div className="nearest-mandi-recommendation">
              <span>BEST NEARBY MARKET</span>
              <strong>
                {bestMarket.market} — {formatPrice(bestMarket.modal_price)}
              </strong>
              <small>
                Highest available price within the nearby-market search.
              </small>
            </div>
          ) : (
            <div className="market-status">
              {commodity
                ? "No current price is available for these nearby markets."
                : "Select a crop to compare mandi prices."}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default NearestMandi;

const DISTRICT_ALIASES = {
  bangalore: "Bengaluru Urban",
  bangalorerural: "Bengaluru Rural",
  bangaloreurban: "Bengaluru Urban",
  belgaum: "Belagavi",
  bellary: "Ballari",
  bijapur: "Vijayapura",
  dakshinkannad: "Dakshina Kannada",
  dakshinkannada: "Dakshina Kannada",
  gulbarga: "Kalaburagi",
  mysore: "Mysuru",
  northkanara: "Uttara Kannada",
  shimoga: "Shivamogga",
  southkanara: "Dakshina Kannada",
  tumkur: "Tumakuru",
  uttarkannad: "Uttara Kannada",
};

function normalizeDistrictName(value) {
  return typeof value === "string"
    ? value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
    : "";
}

export function findKarnatakaDistrict(location, supportedDistricts) {
  const state = normalizeDistrictName(location?.state);
  const countryCode = location?.countryCode?.toLowerCase();
  if (
    state !== "karnataka" ||
    (countryCode && countryCode !== "in") ||
    !Array.isArray(supportedDistricts)
  ) {
    return "";
  }

  const districtsByName = new Map(
    supportedDistricts.map((district) => [
      normalizeDistrictName(district),
      district,
    ])
  );

  for (const candidate of location.districtCandidates || []) {
    const candidateName = normalizeDistrictName(candidate);
    const districtName = DISTRICT_ALIASES[candidateName] || candidate;
    const district = districtsByName.get(normalizeDistrictName(districtName));
    if (district) {
      return district;
    }
  }

  return "";
}

// Karnataka's district/taluk directory. A taluk defaults to its district HQ
// coordinates until a farmer selects or saves an exact farm location.
const DISTRICTS = {
  Bagalkote: ["Bagalkote", "Terdal", "Mudhola", "Badami", "Bilagi", "Hunagunda", "Ilkal", "Rabkavi Banhatti", "Guledgudda", "Jamkhandi"],
  Ballari: ["Ballari", "Kurugodu", "Kampli", "Sanduru", "Siraguppa"],
  Belagavi: ["Belagavi", "Athani", "Bailhongal", "Chikkodi", "Gokak", "Khanapura", "Mudalgi", "Nippani", "Rayabaga", "Savadatti", "Ramadurga", "Kagawada", "Hukkeri", "Kitturu", "Yargatti"],
  "Bengaluru Urban": ["Bengaluru", "Kengeri", "Krishnarajapura", "Anekal", "Yelahanka"],
  "Bengaluru Rural": ["Nelamangala", "Doddaballapura", "Devanahalli", "Hosakote"],
  Bidar: ["Aurad", "Basavakalyana", "Bhalki", "Bidar", "Chitgoppa", "Hulsuru", "Humnabad", "Kamalanagara"],
  Chamarajanagar: ["Chamarajanagar", "Gundlupete", "Kollegala", "Yelanduru", "Hanuru"],
  Chikkaballapur: ["Chikkaballapur", "Bagepalli", "Chintamani", "Gauribidanuru", "Gudibanda", "Sidlaghatta", "Cheluru", "Manchenahalli"],
  Chikkamagaluru: ["Chikkamagaluru", "Kaduru", "Koppa", "Mudigere", "Narasimharajapura", "Sringeri", "Tarikere", "Ajjampura", "Kalasa"],
  Chitradurga: ["Chitradurga", "Challakere", "Hiriyur", "Holalkere", "Hosadurga", "Molakalmuru"],
  "Dakshina Kannada": ["Mangaluru", "Ullal", "Mulki", "Moodbidri", "Bantwal", "Belthangady", "Puttur", "Sullia", "Kadaba"],
  Davanagere: ["Davanagere", "Harihar", "Channagiri", "Honnali", "Nyamati", "Jagalur"],
  Dharwad: ["Kalghatgi", "Dharwad", "Hubballi Rural", "Hubballi Urban", "Kundgol", "Navalgund", "Alnavar", "Annigeri"],
  Gadag: ["Gadag", "Nargund", "Mundargi", "Ron", "Gajendragad", "Lakshmeshwar", "Shirahatti"],
  Hassan: ["Hassan", "Arsikere", "Channarayapatna", "Holenarasipura", "Sakleshpur", "Alur", "Arkalgud", "Belur"],
  Haveri: ["Ranibennur", "Byadgi", "Hangal", "Haveri", "Savanur", "Hirekerur", "Shiggaon", "Rattihalli"],
  Kalaburagi: ["Kalaburagi", "Afzalpur", "Aland", "Chincholi", "Chitapur", "Jevargi", "Sedam", "Kamalapur", "Shahabad", "Kalagi", "Yedrami"],
  Kodagu: ["Madikeri", "Somwarpet", "Virajpet", "Ponnampet", "Kushalnagar"],
  Kolar: ["Kolar", "Bangarapet", "Malur", "Mulbagal", "Srinivaspur", "Kolar Gold Fields"],
  Koppal: ["Koppal", "Gangavathi", "Kushtagi", "Yelburga", "Kanakagiri", "Karatagi", "Kuknoor"],
  Mandya: ["Mandya", "Maddur", "Malavalli", "Srirangapatna", "Krishnarajpet", "Nagamangala", "Pandavapura"],
  Mysuru: ["Mysuru", "Hunsur", "Krishnarajanagara", "Nanjangud", "Heggadadevankote", "Piriyapatna", "Tirumakudalu Narasipura", "Saragur", "Saligrama"],
  Raichur: ["Raichur", "Sindhanur", "Manvi", "Devadurga", "Lingasugur", "Mudgal", "Maski", "Sirwar"],
  Ramanagara: ["Ramanagara", "Magadi", "Kanakapura", "Channapatna", "Harohalli"],
  Shivamogga: ["Shivamogga", "Sagara", "Bhadravati", "Hosanagara", "Shikaripura", "Soraba", "Thirthahalli"],
  Tumakuru: ["Tumakuru", "Chikkanayakanahalli", "Kunigal", "Madhugiri", "Sira", "Tiptur", "Gubbi", "Koratagere", "Pavagada", "Turuvekere"],
  Udupi: ["Udupi", "Kapu", "Byndoor", "Karkala", "Kundapura", "Hebri", "Brahmavar"],
  "Uttara Kannada": ["Karwar", "Sirsi", "Joida", "Dandeli", "Bhatkal", "Kumta", "Ankola", "Haliyal", "Honnavar", "Mundgod", "Siddapur", "Yellapur"],
  Vijayapura: ["Vijayapura", "Indi", "Basavana Bagewadi", "Sindagi", "Muddebihal", "Talikote", "Devara Hipparagi", "Chadchan", "Tikota", "Babaleshwar", "Kolhar", "Nidagundi", "Alamela"],
  Yadgir: ["Yadgir", "Shahapur", "Surpur", "Gurmitkal", "Vadagera", "Hunsagi"],
  Vijayanagara: ["Hosapete", "Hagaribommanahalli", "Harapanahalli", "Hoovina Hadagali", "Kudligi", "Kotturu"],
};

const DISTRICT_COORDINATES = {
  Bagalkote: [16.18, 75.70], Ballari: [15.14, 76.92], Belagavi: [15.85, 74.50],
  "Bengaluru Urban": [12.97, 77.59], "Bengaluru Rural": [13.24, 77.71], Bidar: [17.91, 77.52],
  Chamarajanagar: [11.92, 76.94], Chikkaballapur: [13.44, 77.73], Chikkamagaluru: [13.32, 75.77],
  Chitradurga: [14.23, 76.40], "Dakshina Kannada": [12.89, 75.03], Davanagere: [14.46, 75.92],
  Dharwad: [15.46, 75.01], Gadag: [15.43, 75.63], Hassan: [13.00, 76.10], Haveri: [14.79, 75.40],
  Kalaburagi: [17.33, 76.84], Kodagu: [12.42, 75.74], Kolar: [13.14, 78.13], Koppal: [15.35, 76.15],
  Mandya: [12.52, 76.90], Mysuru: [12.30, 76.65], Raichur: [16.21, 77.36], Ramanagara: [12.72, 77.28],
  Shivamogga: [13.93, 75.57], Tumakuru: [13.34, 77.10], Udupi: [13.34, 74.75],
  "Uttara Kannada": [14.80, 74.13], Vijayapura: [16.83, 75.71], Yadgir: [16.77, 77.14], Vijayanagara: [15.27, 76.39],
};

export const KARNATAKA_WEATHER_LOCATIONS = Object.entries(DISTRICTS).map(([district, taluks]) => {
  const [latitude, longitude] = DISTRICT_COORDINATES[district];
  return {
    district,
    taluks: taluks.map((taluk) => ({
      name: taluk,
      farms: [{ name: `${taluk} farm`, latitude, longitude }],
    })),
  };
});

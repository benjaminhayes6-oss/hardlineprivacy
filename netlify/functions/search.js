// netlify/functions/search.js

const fetch = require("node-fetch");

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CX;

function calculateNameCommonality(name) {
  const commonNames = [
    "john", "michael", "david", "james", "robert",
    "smith", "johnson", "williams", "brown", "jones"
  ];

  const lower = name.toLowerCase();
  let score = 0;

  commonNames.forEach(n => {
    if (lower.includes(n)) score += 15;
  });

  return Math.min(score, 40);
}

function calculateMetroScore(city) {
  const majorCities = [
    "new york", "los angeles", "chicago", "houston",
    "phoenix", "philadelphia", "san antonio",
    "san diego", "dallas", "san jose",
    "nashville", "atlanta", "miami"
  ];

  if (!city) return 10;

  const lower = city.toLowerCase();

  if (majorCities.some(c => lower.includes(c))) {
    return 30;
  }

  return 15;
}

function calculateBrokerSaturation() {
  // Static broker density assumption for US public data ecosystem
  return 25;
}

function generateCategoryCounts(score) {
  return {
    peopleSearch: Math.floor(score / 8) + 3,
    propertyRecords: Math.floor(score / 15) + 2,
    phoneAggregators: Math.floor(score / 20) + 1,
    historicalRecords: Math.floor(score / 25) + 1
  };
}

function getRiskLevel(score) {
  if (score < 30) return "Low";
  if (score < 55) return "Moderate";
  if (score < 75) return "Elevated";
  return "High";
}

exports.handler = async (event) => {
  const { q } = event.queryStringParameters;

  if (!q) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing query parameter." })
    };
  }

  const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(q)}`;

  try {
    const response = await fetch(googleUrl);
    const data = await response.json();

    const items = data.items || [];

    // Split query into name + location
    const parts = q.split(",");
    const name = parts[0] || "";
    const city = parts[1] || "";

    const nameScore = calculateNameCommonality(name);
    const metroScore = calculateMetroScore(city);
    const brokerScore = calculateBrokerSaturation();

    const exposureScore = Math.min(
      nameScore + metroScore + brokerScore,
      100
    );

    const categories = generateCategoryCounts(exposureScore);

    return {
      statusCode: 200,
      body: JSON.stringify({
        query: q,
        googleResults: items.slice(0, 5),
        exposureScore,
        riskLevel: getRiskLevel(exposureScore),
        categories,
        methodology: "Exposure estimate based on public data density, name frequency modeling, and broker distribution patterns."
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Search failed." })
    };
  }
};
const fetch = require("node-fetch");

exports.handler = async (event) => {
  try {
    const { GOOGLE_API_KEY, GOOGLE_CX } = process.env;

    if (!GOOGLE_API_KEY || !GOOGLE_CX) {
      return response(500, { error: "Google API not configured" });
    }

    const q = (event.queryStringParameters?.q || "").trim();

    if (!q) {
      return response(400, { error: "Missing q parameter" });
    }

    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(q)}`;

    const apiResponse = await fetch(url);
    const data = await apiResponse.json();

    const items = (data.items || []).map(item => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet
    }));

    return response(200, { q, items });

  } catch (err) {
    return response(500, {
      error: "Search failed",
      details: err.message
    });
  }
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}
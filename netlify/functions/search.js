exports.handler = async function (event) {
  try {
    const { GOOGLE_API_KEY, GOOGLE_CX } = process.env;

    if (!GOOGLE_API_KEY || !GOOGLE_CX) {
      return response(500, { error: "Google API not configured" });
    }

    const params = new URLSearchParams(event.queryStringParameters || {});
    const q = (params.get("q") || "").trim();

    if (!q) {
      return response(400, { error: "Missing q parameter" });
    }

    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", GOOGLE_API_KEY);
    url.searchParams.set("cx", GOOGLE_CX);
    url.searchParams.set("q", q);

    const r = await fetch(url.toString());
    const data = await r.json();

    const items = (data.items || []).map((item) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
    }));

    return response(200, { q, items });
  } catch (err) {
    return response(500, { error: "Search failed", details: err.message });
  }
};

function response(status, body) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}

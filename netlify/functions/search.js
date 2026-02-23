exports.handler = async (event) => {
  try {
    const { q } = event.queryStringParameters;

    if (!q) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing query parameter" })
      };
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_CX;

    if (!apiKey || !cx) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing environment variables" })
      };
    }

    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(q)}`;

    const response = await fetch(url);
    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Scan failed", details: error.message })
    };
  }
};


export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send('URL parameter is required');
  }

  try {
    const decodedUrl = decodeURIComponent(url);

    // Spoof the User-Agent to look like a browser
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    };

    const response = await fetch(decodedUrl, { headers: headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText} for URL: ${decodedUrl}`);
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.arrayBuffer();

    res.setHeader('Access-Control-Allow-Origin', '*');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    res.status(200).send(Buffer.from(buffer));

  } catch (error) {
    res.status(500).json({ message: `Error fetching the URL: ${error.message}` });
  }
}

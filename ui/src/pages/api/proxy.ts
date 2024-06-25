import type { NextApiRequest, NextApiResponse } from 'next';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const url = 'http://127.0.0.1:8080/graphql';

  // Prepare headers for the outgoing request
  const headers = new Headers({
    'Content-Type': 'application/json'
  });

  // Add or modify additional headers as needed
  if (req.headers['content-type']) {
    headers.set('Content-Type', req.headers['content-type'] as string);
  }

  try {
    const apiRes = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(req.body)
    });

    const data = await apiRes.json();
    res.status(apiRes.status).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error proxying request' });
  }
};

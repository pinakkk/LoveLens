import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { apiKey, instruction, excerpt } = req.body;

    if (!apiKey || !instruction || !excerpt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
    
    const body = {
      contents: [{ 
        role: "user", 
        parts: [{ text: `${instruction}\n\nCONTENT:\n${excerpt}` }] 
      }],
      generationConfig: { 
        temperature: 0.35, 
        maxOutputTokens: 800,
        topP: 0.8,
        topK: 40
      },
    };

    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: `Gemini API error: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    if (!text.trim()) {
      return res.status(500).json({ error: "Empty response from AI" });
    }
    
    return res.status(200).json({ text });

  } catch (error: any) {
    console.error("Gemini proxy error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error.message
    });
  }
}
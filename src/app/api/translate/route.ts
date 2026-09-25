import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: Request) {
  try {
    const { texts, targetLang } = await req.json();
    
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json({ translated: [] });
    }

    let langName = "English";
    if (targetLang === "gu") langName = "Gujarati";
    if (targetLang === "hi") langName = "Hindi";

    const prompt = `Translate the following JSON array of strings to ${langName}. 
Keep the exact same array structure. Return ONLY valid JSON array of strings, nothing else. No markdown formatting.
Texts to translate: ${JSON.stringify(texts)}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch from Gemini API' }, { status: 500 });
    }

    const data = await response.json();
    let translatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    
    if (translatedText.startsWith('```json')) {
      translatedText = translatedText.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    const translatedArray = JSON.parse(translatedText);

    return NextResponse.json({ translated: translatedArray });
  } catch (error) {
    console.error('Translation Error:', error);
    return NextResponse.json({ error: 'Failed to translate' }, { status: 500 });
  }
}

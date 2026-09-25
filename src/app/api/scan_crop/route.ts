import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as globalThis.File;
    const lang = formData.get('lang') || 'gu';

    if (!file) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';
    const langName = lang === 'gu' ? 'Gujarati' : lang === 'hi' ? 'Hindi' : 'English';

    const systemPrompt = `You are Krushi Sarathi, an expert agricultural AI.
Analyze the provided crop image and identify the disease/pest.
You MUST provide the response in ${langName} language.
STRICTLY return the response in this exact JSON format (do NOT wrap in markdown code blocks):
{
  "crop_name": "Name of the crop/plant identified in the image (in ${langName})",
  "disease_name": "Name of the disease (in ${langName})",
  "confidence": 0.85,
  "remedy_organic": "Exact organic/biological treatment including fertilizer/medicine name and dosage (in ${langName})",
  "remedy_chemical": "Exact chemical medicine name, dosage, and safety warning (in ${langName})",
  "severity": "Low/Medium/High (in ${langName})"
}`;

    const requestBody = {
      contents: [{
        parts: [
          { text: systemPrompt },
          { inline_data: { mime_type: mimeType, data: base64Image } }
        ]
      }]
    };

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(errText);
      return NextResponse.json({ error: 'Google API Error: ' + errText }, { status: 500 });
    }

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Clean up potential markdown JSON wrapper
    const cleanedText = rawText.replace(/\s*```json\s*/g, '').replace(/\s*```\s*/g, '').trim();
    
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch(e) {
      console.error("JSON Parse Error:", cleanedText);
      parsedData = {
        disease_name: "Unknown / Failed to parse",
        confidence: 0.5,
        remedy_organic: "Consult an expert.",
        remedy_chemical: "Consult an expert.",
        severity: "Medium"
      };
    }

    return NextResponse.json({
      success: true,
      crop_name: parsedData.crop_name,
      disease: parsedData.disease_name,
      confidence: parsedData.confidence,
      remedy_organic: parsedData.remedy_organic,
      remedy_chemical: parsedData.remedy_chemical,
      advice: "Severity: " + parsedData.severity
    });

  } catch (error: any) {
    console.error('Analysis Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get AI advice' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const base64Audio = body.audio;
    const lang = body.lang || 'gu';
    const mimeType = body.mimeType || 'audio/webm';
    
    if (!base64Audio) throw new Error("No audio provided");

    const systemPrompt = `You are "Krushi Sarathi", an AI assistant for farmers.
CRITICAL INSTRUCTION: You will receive an audio clip. You must FIRST detect what language the user is speaking in the audio (English, Gujarati, or Hindi).
THEN, you MUST generate your response in that EXACT SAME language. 
- If the audio is spoken in Gujarati, your JSON "message" field MUST be in Gujarati script.
- If the audio is spoken in Hindi, your JSON "message" field MUST be in Hindi script.
- If the audio is spoken in English, your JSON "message" field MUST be in English.
Do NOT reply in English if the user spoke in Gujarati or Hindi! MATCH THEIR SPOKEN LANGUAGE EXACTLY.

If they ask about the weather (today, tomorrow, or next week), provide a helpful farming-related weather response in their language (e.g. "તમારા વિસ્તારમાં વરસાદની શક્યતા છે, ડેશબોર્ડ પરથી લાઈવ માહિતી જુઓ"), and optionally trigger the "navigate_dashboard" action so they can see the live weather card.


If the audio is completely silent, unclear, or you cannot understand it, you MUST output this exact JSON:
{"action": "answer", "message": "કૃપા કરીને ફરીથી બોલશો? મને બરાબર સંભળાયું નહિ. (Please say that again)"}

Your job is to act as a voice controller for the app and answer farming questions.

Determine the user's intent. Output ONLY a valid JSON object with no markdown formatting or backticks.
The JSON must have this exact structure:
{
  "action": "action_name",
  "message": "Your response to the user in the language they spoke"
}

Available actions:
- "navigate_camera": If they want to scan a crop, take a photo, or check for disease.
- "navigate_dashboard": If they want to see weather, go home, or see the dashboard.
- "navigate_farms": If they want to manage their farms (add/edit/delete).
- "navigate_history": If they want to see past records.
- "navigate_hotspots": If they ask about disease spread, outbreaks nearby, or hotspot map.
- "navigate_profile": If they want to edit profile, see their account details.
- "answer": For general farming questions that don't require navigation.
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [{
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Audio
              }
            }
          ]
        }],
        generationConfig: {
          response_mime_type: "application/json"
        }
      })
    });

    if (response.status === 429) {
       let limitMsg = 'Take some time, API limit reached. (Please wait a bit)';
       if (lang === 'gu') limitMsg = 'API ની લિમિટ પૂરી થઈ ગઈ છે, થોડી વાર પછી પ્રયત્ન કરો.';
       if (lang === 'hi') limitMsg = 'API की लिमिट खत्म हो गई है, थोड़ी देर बाद प्रयास करें।';
       return NextResponse.json({ action: 'answer', message: limitMsg });
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API Error: ${response.status} - ${errorText}`);
      throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch(e) {
      parsed = { action: "answer", message: text };
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('API Error:', error);
    let errorMsg = `માફ કરજો, સિસ્ટમમાં ખામી આવી છે. Error: ${error.message}`;
    
    if (error.message.includes('API_KEY_INVALID') || error.message.includes('400') || error.message.includes('403')) {
      errorMsg = 'API Key ખોટી છે, કૃપા કરીને Vercel માં સાચી કી નાખો. (Invalid API Key)';
    }

    return NextResponse.json({ 
      action: 'answer', 
      message: errorMsg
    }, { status: 500 });
  }
}

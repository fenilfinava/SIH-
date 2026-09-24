import { NextResponse } from 'next/server';

async function handleTTS(text: string, lang: string) {
  // Normalize lang code for Google Translate (e.g. gu-IN -> gu)
  lang = lang.split('-')[0];
  if (!text) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 });
  }

  const safeText = text.substring(0, 200);
  
  const urls = [
    `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(safeText)}&tl=${lang}&client=gtx`,
    `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(safeText)}&tl=${lang}&client=tw-ob`
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return new NextResponse(arrayBuffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    } catch (e) {
      continue;
    }
  }

  return NextResponse.json({ error: 'TTS unavailable' }, { status: 503 });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text') || '';
    const lang = searchParams.get('lang') || 'gu';
    return handleTTS(text, lang);
  } catch (error) {
    console.error('TTS Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = body.text || '';
    const lang = body.lang || 'gu';
    return handleTTS(text, lang);
  } catch (error) {
    console.error('TTS Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

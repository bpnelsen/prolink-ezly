import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { prompt } = await request.json()

  // Prolink Foreman Context
  const systemPrompt = `You are a highly experienced Technical Foreman AI for a construction/home services company (Prolink). 
  You provide practical, code-compliant, and safety-focused solutions. 
  If a question is vague, ask for technical specifications or photos.
  Always prioritize safety, code compliance, and contractor reputation.`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-pro-1.5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
      }),
    })

    const data = await response.json()
    return NextResponse.json({ response: data.choices[0].message.content })
  } catch (err) {
    return NextResponse.json({ response: 'Foreman system offline. Please check API settings.' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY is not configured in environment variables.' }, { status: 500 })
  }

  const { questionnaire } = await req.json()

  const { business_name, owner_name, tagline, about_story, services, service_areas,
    phone, email, years_experience, licensed, insured, sections } = questionnaire

  const sectionList = (sections as string[]).join(', ')

  const prompt = `You are a professional website copywriter for contractor businesses. Generate compelling, conversion-focused website copy.

Business Info:
- Business Name: ${business_name}
- Owner: ${owner_name}
- Tagline: ${tagline || 'Quality Work, Every Time'}
- About: ${about_story || 'A trusted local contractor serving the community.'}
- Services: ${(services as string[]).join(', ')}
- Service Areas: ${service_areas}
- Phone: ${phone}
- Email: ${email || ''}
- Years in Business: ${years_experience}
- Licensed: ${licensed ? 'Yes' : 'No'}
- Insured: ${insured ? 'Yes' : 'No'}

Sections needed: ${sectionList}

Return ONLY a valid JSON object with this exact structure (include only sections listed above):
{
  "hero": {
    "headline": "Bold 6-10 word headline",
    "subheadline": "2-sentence value proposition mentioning services and location",
    "cta_primary": "Get a Free Quote",
    "cta_secondary": "Call ${phone}"
  },
  "services": [
    { "name": "Service Name", "description": "2-sentence description of this service", "icon": "🔧" }
  ],
  "about": {
    "headline": "Short headline about the business",
    "body": "3-4 sentences about the business story, values, and what makes them different."
  },
  "gallery": {
    "headline": "Our Work Speaks for Itself",
    "subheadline": "Browse completed projects from satisfied customers across ${service_areas}"
  },
  "reviews": [
    { "name": "First Last", "location": "City, State", "text": "2-3 sentence glowing testimonial", "rating": 5 },
    { "name": "First Last", "location": "City, State", "text": "2-3 sentence testimonial", "rating": 5 },
    { "name": "First Last", "location": "City, State", "text": "2-3 sentence testimonial", "rating": 5 }
  ],
  "contact": {
    "headline": "Ready to Get Started?",
    "body": "1-2 sentences encouraging the visitor to reach out for a free estimate."
  }
}

Use real-sounding names for reviews. Make everything specific to this contractor's trade and location. Return only valid JSON, no markdown, no other text.`

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://useezly.com',
      'X-Title': 'Prolink Website Builder',
    },
    body: JSON.stringify({
      model: 'google/gemini-3.1-flash-lite-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return NextResponse.json({ error: 'AI generation failed', detail: err }, { status: 500 })
  }

  const data = await response.json()
  const raw = data.choices?.[0]?.message?.content ?? '{}'

  let content: Record<string, unknown>
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    content = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw }, { status: 500 })
  }

  return NextResponse.json({ content })
}

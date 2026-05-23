import { NextRequest, NextResponse } from 'next/server'

const SECTION_SCHEMAS: Record<string, string> = {
  hero: `"hero": {
    "headline": "Bold 6-10 word headline",
    "subheadline": "2-sentence value proposition mentioning services and location",
    "cta_primary": "Get a Free Quote",
    "cta_secondary": "Call us"
  }`,
  services: `"services": [
    { "name": "Service Name", "description": "2-sentence description", "icon": "🔧" }
  ]`,
  about: `"about": {
    "headline": "Short headline about the business",
    "body": "3-4 sentences about the story, values, and what makes them different."
  }`,
  gallery: `"gallery": {
    "headline": "Our Work Speaks for Itself",
    "subheadline": "Browse completed projects from satisfied customers"
  }`,
  reviews: `"reviews": [
    { "name": "First Last", "location": "City, State", "text": "2-3 sentence glowing testimonial", "rating": 5 },
    { "name": "First Last", "location": "City, State", "text": "2-3 sentence testimonial", "rating": 5 },
    { "name": "First Last", "location": "City, State", "text": "2-3 sentence testimonial", "rating": 5 }
  ]`,
  contact: `"contact": {
    "headline": "Ready to Get Started?",
    "body": "1-2 sentences encouraging the visitor to reach out for a free estimate."
  }`,
}

interface Questionnaire {
  business_name?: string
  owner_name?: string
  tagline?: string
  about_story?: string
  services?: string[]
  service_areas?: string
  phone?: string
  email?: string
  years_experience?: string
  licensed?: boolean
  insured?: boolean
  sections?: string[]
}

function buildPrompt(q: Questionnaire, only?: string): string {
  const requested = only ? [only] : (q.sections || [])
  const schema = requested
    .filter(s => SECTION_SCHEMAS[s])
    .map(s => SECTION_SCHEMAS[s])
    .join(',\n  ')

  return `You are a professional website copywriter for contractor businesses. Generate compelling, conversion-focused website copy.

Business Info:
- Business Name: ${q.business_name || 'Local Contractor'}
- Owner: ${q.owner_name || ''}
- Tagline: ${q.tagline || 'Quality Work, Every Time'}
- About: ${q.about_story || 'A trusted local contractor serving the community.'}
- Services: ${(q.services || []).join(', ')}
- Service Areas: ${q.service_areas || ''}
- Phone: ${q.phone || ''}
- Email: ${q.email || ''}
- Years in Business: ${q.years_experience || ''}
- Licensed: ${q.licensed ? 'Yes' : 'No'}
- Insured: ${q.insured ? 'Yes' : 'No'}

${only ? `Regenerate ONLY the "${only}" section with fresh, distinct copy.` : `Sections requested: ${requested.join(', ')}`}

Return ONLY a valid JSON object with this exact structure:
{
  ${schema}
}

Use real-sounding names for reviews. Make everything specific to this contractor's trade and location. Keep copy tight, concrete, and conversion-focused. Return only valid JSON, no markdown, no other text.`
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY is not configured in environment variables.' }, { status: 500 })
  }

  const body: { questionnaire?: Questionnaire; section?: string } = await req.json()
  const questionnaire = body.questionnaire || {}
  const only = body.section && SECTION_SCHEMAS[body.section] ? body.section : undefined

  const prompt = buildPrompt(questionnaire, only)

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
      temperature: 0.8,
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

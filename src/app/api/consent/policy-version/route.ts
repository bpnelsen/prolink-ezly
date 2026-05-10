import { NextResponse } from 'next/server'
import { POLICY_VERSION, UI_VERSION } from '@/lib/consent/policy'

export const runtime = 'edge'

export async function GET() {
  return NextResponse.json({ policy_version: POLICY_VERSION, ui_version: UI_VERSION })
}

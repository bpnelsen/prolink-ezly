// Force these routes to render at request time so unauthenticated visitors
// can't pull a prerendered shell of authenticated pages from Vercel's edge
// cache. The real auth gate is in middleware.ts.
export const dynamic = 'force-dynamic'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}

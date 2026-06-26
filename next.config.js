/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), payment=(self), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "img-src 'self' data: blob: https:",
      // blob: lets the marketing video bundle load its embedded webfonts,
      // which it unpacks into blob: URLs and applies via @font-face.
      "font-src 'self' data: blob: https://fonts.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // blob: is required by the self-unpacking marketing video bundle
      // (/prolink-video.html), which decodes React/ReactDOM/Babel into
      // blob: URLs and injects them as <script> tags; Babel then fetches
      // those blob: sources (hence blob: in connect-src too). Safe here
      // because the policy already allows 'unsafe-inline'/'unsafe-eval'.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://www.google-analytics.com https://js.stripe.com https://maps.googleapis.com https://maps.gstatic.com",
      "connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://api.stripe.com https://openrouter.ai https://maps.googleapis.com https://photon.komoot.io",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      'upgrade-insecure-requests',
    ].join('; '),
  },
];

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;

import './globals.css'
import Script from 'next/script'
import { cookies } from 'next/headers'
import JackWrapper from '@/components/JackWrapper'
import AppShell from '@/components/AppShell'
import ReportBugButton from '@/components/ReportBugButton'
import GoogleMapsProvider from '@/components/maps/GoogleMapsProvider'
import { AppProvider } from '../context/AppContext'
import { ConsentProvider } from '@/components/consent/ConsentProvider'
import { CookieBanner } from '@/components/consent/CookieBanner'
import { OptOutToast } from '@/components/consent/OptOutToast'
import { ConsentGate } from '@/components/consent/ConsentGate'
import type { Regime } from '@/lib/consent/types'

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const regimeCookie = cookies().get('__consent_region')?.value
  const initialRegime: Regime =
    regimeCookie === 'gdpr' || regimeCookie === 'ccpa' || regimeCookie === 'default'
      ? regimeCookie
      : 'default'

  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {GA_ID && (
          <Script id="google-consent-default" strategy="beforeInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('consent', 'default', {
                analytics_storage: 'denied',
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                personalization_storage: 'denied',
                wait_for_update: 500
              });
            `}
          </Script>
        )}
      </head>
      <body className="bg-gray-50 text-gray-700">
        <ConsentProvider initialRegime={initialRegime}>
          <AppProvider>
            <GoogleMapsProvider>
              <AppShell>{children}</AppShell>
              <JackWrapper />
              <ReportBugButton />
            </GoogleMapsProvider>
          </AppProvider>
          {GA_ID && (
            <ConsentGate category="analytics">
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
                strategy="afterInteractive"
              />
              <Script id="google-analytics" strategy="afterInteractive">
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_ID}');
                `}
              </Script>
            </ConsentGate>
          )}
          <CookieBanner />
          <OptOutToast />
        </ConsentProvider>
      </body>
    </html>
  )
}

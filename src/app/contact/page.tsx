'use client'

import { useEffect, useState } from 'react'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // The homepage renders /ezly-marketing.html in an iframe. If a link in
  // that marketing HTML lacks target="_top", /contact loads inside the
  // iframe — and every link on this page then navigates only the iframe,
  // making them feel broken. Pop back to the top window so the page (and
  // its links) behave normally.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.self !== window.top && window.top) {
      window.top.location.href = window.location.href
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, message, website }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setStatus('error')
        setErrorMsg(
          data.error === 'invalid_email'
            ? 'Please enter a valid email address.'
            : 'Something went wrong. Please try again or email us directly at ezly.home@gmail.com.',
        )
        return
      }
      setStatus('sent')
      setName('')
      setEmail('')
      setMessage('')
    } catch {
      setStatus('error')
      setErrorMsg('Network error. Please try again.')
    }
  }

  return (
    <>
      <div className="max-w-xl mx-auto px-6 py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-gray-500 mb-6">
        <ol className="flex items-center gap-2">
          <li><a href="/" className="text-[#0f3a7d] hover:underline">Home</a></li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-700" aria-current="page">Contact</li>
        </ol>
      </nav>

      <h1 className="text-3xl font-black text-[#0f3a7d] mb-2 text-center">Contact us</h1>
      <p className="text-gray-600 mb-8 text-center">
        Questions, feedback, or want a demo? Send a note and a real person will reply.
      </p>

      {status === 'sent' ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <h2 className="text-lg font-bold text-green-900">Message sent</h2>
          <p className="mt-2 text-sm text-green-800">
            Thanks for reaching out. We&rsquo;ll get back to you shortly at the email you provided.
          </p>
          <button
            type="button"
            onClick={() => setStatus('idle')}
            className="mt-4 text-sm font-medium text-[#0f3a7d] underline hover:no-underline"
          >
            Send another message
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="contact-name" className="block text-sm font-semibold text-gray-700 mb-1">
              Your name <span className="font-normal text-gray-500">(optional)</span>
            </label>
            <input
              id="contact-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0f3a7d] focus:outline-none focus:ring-1 focus:ring-[#0f3a7d]"
            />
          </div>

          <div>
            <label htmlFor="contact-email" className="block text-sm font-semibold text-gray-700 mb-1">
              Email <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              id="contact-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0f3a7d] focus:outline-none focus:ring-1 focus:ring-[#0f3a7d]"
            />
          </div>

          <div>
            <label htmlFor="contact-message" className="block text-sm font-semibold text-gray-700 mb-1">
              Message <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <textarea
              id="contact-message"
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0f3a7d] focus:outline-none focus:ring-1 focus:ring-[#0f3a7d]"
            />
          </div>

          <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
            <label>
              Website
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </label>
          </div>

          {status === 'error' && (
            <p role="alert" className="text-sm text-red-700">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'sending'}
            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#0f3a7d] px-4 text-sm font-semibold text-white transition hover:bg-[#0c2f64] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f3a7d] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === 'sending' ? 'Sending…' : 'Send message'}
          </button>
        </form>
      )}

      <div className="mt-12 pt-6 border-t border-gray-200">
        <a href="/" className="text-[#0f3a7d] hover:underline">&larr; Back to home</a>
      </div>
    </div>
      <MarketingFooter />
    </>
  )
}
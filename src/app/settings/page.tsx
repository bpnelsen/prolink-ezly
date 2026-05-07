'use client'
import {
  Building2,
  Users,
  ListChecks,
  MapPin,
  Clock,
  Tag,
  CreditCard,
  Banknote,
  Gift,
  MessageSquare,
  Bell,
  Lock,
  Palette,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import Breadcrumbs from '../../components/Breadcrumbs'

const SETTINGS_CARDS = [
  {
    title: 'Company Profile',
    desc: 'Update your business information and branding',
    href: '/settings/profile',
    icon: Building2,
  },
  {
    title: 'Team & Permissions',
    desc: 'Manage employees, roles and access levels',
    href: '/dashboard/technicians',
    icon: Users,
  },
  {
    title: 'My Price List',
    desc: 'Service catalog with categories and flat-rate pricing',
    href: '/settings/price-list',
    icon: ListChecks,
    soon: true,
  },
  {
    title: 'Online Booking Rates',
    desc: 'Pricing shown to customers on your Prolink site',
    href: '/settings/booking-rates',
    icon: ListChecks,
    soon: true,
  },
  {
    title: 'Service Area',
    desc: 'Geographic area and zip codes you serve',
    href: '/settings/profile#service-area',
    icon: MapPin,
  },
  {
    title: 'Business Hours',
    desc: 'Hours of operation and scheduling windows',
    href: '/settings/profile#business-hours',
    icon: Clock,
  },
  {
    title: 'Tags',
    desc: 'Custom tags used across jobs, customers and invoices',
    href: '/settings/tags',
    icon: Tag,
    soon: true,
  },
  {
    title: 'Billing & Subscription',
    desc: 'Manage your Prolink plan and monthly charges',
    href: '/settings/billing',
    icon: CreditCard,
  },
  {
    title: 'Payouts / Stripe Connect',
    desc: 'Connect your bank to accept online customer payments',
    href: '/settings/payouts',
    icon: Banknote,
  },
  {
    title: 'Refer & Earn',
    desc: 'Share Prolink and earn credits for every referral',
    href: '/settings/referrals',
    icon: Gift,
    soon: true,
  },
  {
    title: 'Messaging',
    desc: 'Customize automated texts and email templates',
    href: '/settings/messaging',
    icon: MessageSquare,
    soon: true,
  },
  {
    title: 'Notifications',
    desc: 'Control alerts for jobs, invoices and activity',
    href: '/settings/notifications',
    icon: Bell,
  },
  {
    title: 'Design & Theme',
    desc: 'Brand colors and custom appearance',
    href: '/settings/design',
    icon: Palette,
  },
  {
    title: 'Access & Security',
    desc: 'Password, two-factor authentication and sessions',
    href: '/settings/security',
    icon: Lock,
  },
]

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[{ label: 'Settings', href: '/settings' }]} />
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Account</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Settings</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SETTINGS_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <Link
                key={card.title}
                href={card.href}
                className={`group relative bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:border-teal-400 hover:shadow-md transition flex flex-col gap-3 ${card.soon ? 'opacity-60 pointer-events-none' : ''}`}
              >
                {card.soon && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    Soon
                  </span>
                )}
                <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-teal-400 group-hover:bg-teal-600 group-hover:text-white transition">
                  <Icon size={18} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">{card.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{card.desc}</p>
                </div>
                <ChevronRight size={14} className="text-gray-300 group-hover:text-teal-500 transition self-end" />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

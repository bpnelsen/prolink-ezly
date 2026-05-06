export default function ProlinkLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Small gray circle */}
      <circle cx="14" cy="26" r="9" fill="#9CA3AF" opacity="0.7" />
      {/* Large orange circle */}
      <circle cx="32" cy="26" r="16" fill="#F97316" />
      {/* Prolink text */}
      <text x="56" y="34" fontFamily="'Inter', 'Helvetica Neue', sans-serif" fontSize="26" fontWeight="800" fill="white" letterSpacing="-0.5">Prolink</text>
      {/* PRO NETWORK text */}
      <text x="57" y="52" fontFamily="'Inter', 'Helvetica Neue', sans-serif" fontSize="10" fontWeight="700" fill="#F97316" letterSpacing="3">PRO NETWORK</text>
    </svg>
  );
}

export default function ProlinkLogoDark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="14" cy="26" r="9" fill="#9CA3AF" opacity="0.7" />
      <circle cx="32" cy="26" r="16" fill="#F97316" />
      <text x="56" y="34" fontFamily="'Inter', 'Helvetica Neue', sans-serif" fontSize="26" fontWeight="800" fill="#0f1d35" letterSpacing="-0.5">Prolink</text>
      <text x="57" y="52" fontFamily="'Inter', 'Helvetica Neue', sans-serif" fontSize="10" fontWeight="700" fill="#F97316" letterSpacing="3">PRO NETWORK</text>
    </svg>
  );
}

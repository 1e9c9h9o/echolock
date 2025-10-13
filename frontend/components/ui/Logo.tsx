export default function Logo({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="none" stroke="#0045D3" strokeWidth="5" style={{ mixBlendMode: 'multiply' }} />
      <circle cx="50" cy="50" r="35" fill="none" stroke="#FF4D00" strokeWidth="5" style={{ mixBlendMode: 'multiply' }} />
      <circle cx="50" cy="50" r="25" fill="none" stroke="#0045D3" strokeWidth="5" style={{ mixBlendMode: 'multiply' }} />
      <circle cx="50" cy="50" r="15" fill="none" stroke="#FF4D00" strokeWidth="5" style={{ mixBlendMode: 'multiply' }} />
      <circle cx="50" cy="50" r="5" fill="#212121" />
    </svg>
  )
}

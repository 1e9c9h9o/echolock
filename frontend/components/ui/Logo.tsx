import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizes = {
    sm: 80,
    md: 120,
    lg: 160,
  }

  return (
    <Image
      src="/logo.png"
      alt="EchoLock"
      width={sizes[size]}
      height={sizes[size]}
      className={className}
      priority
    />
  )
}

interface LocationDotProps {
  className?: string
}

export default function LocationDot({ className = "" }: LocationDotProps) {
  return (
    <div
      className={`inline-block w-2.5 h-2.5 rounded-full bg-[#4285f4] ${className}`}
      style={{ width: "10px", height: "10px" }}
    />
  )
}

import { cn } from "@/lib/utils";

interface LogoMarkProps {
  size?: number;
  className?: string;
  gradientId?: string;
}

export function LogoMark({ size = 32, className, gradientId = "jf-logo" }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 rounded-lg", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="9" fill={`url(#${gradientId})`} />
      <g stroke="white" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5,32 L9.5,8 L29,8 L29,26 C29,34 18,35 16,29" />
        <line x1="9.5" y1="20" x2="20" y2="20" />
      </g>
    </svg>
  );
}

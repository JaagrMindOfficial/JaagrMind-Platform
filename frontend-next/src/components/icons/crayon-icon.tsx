import React from "react";

interface CrayonIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function CrayonIcon({ className = "h-5 w-5", size, ...props }: CrayonIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      {/* Crayon cone tip pointing bottom-left */}
      <path d="M4.5 15.5 L2.5 21.5 L8.5 19.5 Z" fill="currentColor" fillOpacity="0.3" />
      <path d="M4.5 15.5 L2.5 21.5 L8.5 19.5" />
      
      {/* Wax shoulder line */}
      <path d="M4.5 15.5 L8.5 19.5" strokeWidth="1.5" />
      
      {/* Main crayon wrapper body */}
      <path d="M4.5 15.5 L15.5 4.5 L19.5 8.5 L8.5 19.5 Z" />
      
      {/* Top flat end */}
      <path d="M15.5 4.5 L19.5 8.5" />
      
      {/* Classic crayon wrapper stripes (lower band) */}
      <path d="M6 14 L10 18" strokeWidth="1.5" />
      <path d="M7.5 12.5 L11.5 16.5" strokeWidth="1.5" />
      
      {/* Classic crayon wrapper stripes (upper band) */}
      <path d="M12.5 7.5 L16.5 11.5" strokeWidth="1.5" />
      <path d="M14 6 L18 10" strokeWidth="1.5" />
      
      {/* Center wrapper decorative oval mark */}
      <ellipse cx="12" cy="12" rx="2.5" ry="1.2" transform="rotate(-45 12 12)" strokeWidth="1.2" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

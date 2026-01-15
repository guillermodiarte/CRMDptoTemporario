import { cn } from "@/lib/utils";

export const Logo = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={cn("h-10 w-10 text-primary", className)}
      fill="currentColor"
    >
      {/* Abstract Modern Building / House */}

      {/* Roof - Darker / Solid */}
      <path d="M50 10 L90 40 H10 Z" className="fill-primary" />

      {/* Body - Slightly Lighter / Opacity for depth */}
      <path d="M20 40 V85 A5 5 0 0 0 25 90 H75 A5 5 0 0 0 80 85 V40" className="opacity-80" />

      {/* Window - Cutout (uses background color implicitly by being transparent or overlay) */}
      {/* Actually using a clear rect for "window" effect */}
      <rect x="35" y="55" width="30" height="20" rx="2" className="fill-background" />

    </svg>
  );
};

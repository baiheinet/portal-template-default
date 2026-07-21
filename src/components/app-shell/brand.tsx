import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm ring-1 ring-black/5",
        className
      )}
    >
      <img
        src="/nocobase-logo.png"
        alt=""
        className="size-full object-contain"
      />
    </span>
  );
}
type BrandProps = {
  className?: string;
  logoClassName?: string;
  showText?: boolean;
};

export function Brand({
  className,
  logoClassName,
  showText = true,
}: BrandProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <BrandLogo className={logoClassName} />
      {showText && (
        <span className="truncate text-base font-semibold tracking-[-0.02em] text-foreground">
          NocoBase
        </span>
      )}
    </div>
  );
}

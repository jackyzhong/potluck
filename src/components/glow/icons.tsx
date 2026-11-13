// The few stroke icons the foundation components draw. 24 viewBox, stroke 2,
// round caps and joins, currentColor (docs/02 "Icons"). Decorative, so aria-hidden.
import type { SVGProps } from "react";

function Icon({ size = 18, strokeWidth = 2, children, ...rest }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function SearchIcon(props: { size?: number; className?: string }) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </Icon>
  );
}

export function CheckIcon(props: { size?: number; className?: string }) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  );
}

export function AlertIcon(props: { size?: number; className?: string }) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5h.01" />
    </Icon>
  );
}

export function ChevronDownIcon(props: { size?: number; className?: string }) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="M6 9l6 6 6-6" />
    </Icon>
  );
}

export function CloseIcon(props: { size?: number; className?: string }) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}

export function PeopleIcon(props: { size?: number; className?: string }) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5" />
      <path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.9c1.6.9 2.7 2.6 3 5.1" />
    </Icon>
  );
}

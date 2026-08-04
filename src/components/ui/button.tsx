import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary/90 border border-transparent',
  accent:
    'bg-accent text-accent-foreground hover:bg-accent/90 border border-transparent',
  secondary:
    'bg-primary-muted text-primary hover:bg-primary-muted/70 border border-primary/15',
  outline:
    'bg-card text-foreground hover:bg-muted border border-border',
  ghost:
    'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent',
  danger:
    'bg-destructive-muted text-destructive hover:bg-destructive/15 border border-destructive/20',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-lg font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading ? (
        <Loader2 className={size === 'sm' ? 'h-3.5 w-3.5 animate-spin' : 'h-4 w-4 animate-spin'} aria-hidden="true" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  variant = 'ghost',
  className = '',
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: Variant }) {
  return (
    <button
      {...rest}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  );
}

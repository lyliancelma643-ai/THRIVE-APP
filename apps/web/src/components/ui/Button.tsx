import React from 'react';

// Bouton de marque unifié (navy / sun / sage). Remplace les boutons inline
// dupliqués (login, coach, admin). Cibles tactiles ≥ 44 px, feedback :active
// géré globalement (globals.css).
type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-navy-600 hover:bg-navy-700 text-white',
  accent: 'bg-sun hover:bg-sun-dark text-navy-900',
  secondary: 'bg-navy-50 hover:bg-navy-100 text-navy-700',
  ghost: 'bg-transparent hover:bg-navy-50 text-navy-700',
  danger: 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-100',
};

const SIZES: Record<Size, string> = {
  sm: 'min-h-[40px] px-4 py-2 text-sm',
  md: 'min-h-[48px] px-6 py-3 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {children}
    </button>
  );
}

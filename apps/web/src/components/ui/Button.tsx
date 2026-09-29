import React from 'react';

// Bouton de marque unifié (navy / sun / sage). Remplace les boutons inline
// dupliqués (login, coach, admin). Cibles tactiles ≥ 44 px, feedback :active
// géré globalement (globals.css), survol limité aux pointeurs fins.
// `loading` : le bouton garde sa taille, affiche un indicateur et bloque le
// double envoi (désactivé + aria-busy).
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
  sm: 'min-h-[44px] px-4 py-2 text-sm',
  md: 'min-h-[48px] px-6 py-3 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`relative inline-flex items-center justify-center gap-2 rounded-full font-bold transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading && (
        <span
          aria-hidden
          className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"
        />
      )}
      {children}
    </button>
  );
}

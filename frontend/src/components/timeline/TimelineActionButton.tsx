import type { ButtonHTMLAttributes } from 'react'
import { timelineTheme } from './theme'

type Variant = 'primary' | 'warning' | 'ghost'

interface TimelineActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const VARIANTS: Record<Variant, React.CSSProperties> = {
  primary: {
    background: `linear-gradient(135deg, ${timelineTheme.blue} 0%, ${timelineTheme.blue}dd 100%)`,
    color: '#fff',
    border: '1px solid rgba(85, 139, 113, 0.45)',
    boxShadow: '0 6px 14px rgba(63, 107, 86, 0.22)',
  },
  warning: {
    background: 'rgba(255, 214, 10, 0.08)',
    color: timelineTheme.yellow,
    border: `1px solid ${timelineTheme.yellow}55`,
  },
  ghost: {
    background: 'rgba(255,255,255,0.03)',
    color: timelineTheme.textSecondary,
    border: `1px solid ${timelineTheme.border}`,
  },
}

export function TimelineActionButton({
  variant = 'primary',
  style,
  disabled,
  className,
  ...props
}: TimelineActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={typeof props.children === 'string' ? props.children : undefined}
      className={`timeline-action-btn timeline-action-btn--${variant}${className ? ` ${className}` : ''}`}
      {...props}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '8px 14px',
        borderRadius: 11,
        fontSize: '0.78rem',
        fontWeight: 600,
        letterSpacing: '0.01em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'transform 0.15s ease, box-shadow 0.18s ease, background 0.18s ease',
        ...VARIANTS[variant],
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    />
  )
}

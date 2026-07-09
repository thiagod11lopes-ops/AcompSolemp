import type { ButtonHTMLAttributes } from 'react'
import { timelineTheme } from './theme'

type Variant = 'primary' | 'warning' | 'ghost'

interface TimelineActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const VARIANTS: Record<Variant, React.CSSProperties> = {
  primary: {
    background: timelineTheme.blue,
    color: '#fff',
    border: 'none',
  },
  warning: {
    background: 'transparent',
    color: timelineTheme.yellow,
    border: `1px solid ${timelineTheme.yellow}55`,
  },
  ghost: {
    background: 'transparent',
    color: timelineTheme.textSecondary,
    border: `1px solid ${timelineTheme.border}`,
  },
}

export function TimelineActionButton({
  variant = 'primary',
  style,
  disabled,
  ...props
}: TimelineActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={typeof props.children === 'string' ? props.children : undefined}
      {...props}
      style={{
        padding: '8px 14px',
        borderRadius: 10,
        fontSize: '0.78rem',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
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

import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?:  boolean
  children:  ReactNode
  className?: string
}

export function LoadingButton({ loading, children, className, disabled, onClick, ...rest }: Props) {
  return (
    <button
      {...rest}
      className={className}
      disabled={disabled || loading}
      onClick={onClick}
      style={{
        ...rest.style,
        opacity:  loading ? 0.7 : undefined,
        cursor:   loading ? 'not-allowed' : undefined,
        position: 'relative',
      }}
    >
      {loading ? (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{
            width: 16, height: 16,
            border: '2.5px solid rgba(0,0,0,0.15)',
            borderTopColor: 'currentColor',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.7s linear infinite',
          }} />
          {children}
        </span>
      ) : children}
    </button>
  )
}
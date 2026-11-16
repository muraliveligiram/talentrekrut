import type { ComponentProps } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { buttonVariants, type ButtonSize, type ButtonVariant } from './button-variants'
import { Spinner } from './spinner'

interface VariantProps {
  variant?: ButtonVariant
  size?: ButtonSize
}

interface ButtonProps extends ComponentProps<'button'>, VariantProps {
  loading?: boolean
}

export function Button({ variant, size, className, loading, disabled, children, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonVariants({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

export function ButtonLink({ variant, size, className, ...props }: LinkProps & VariantProps) {
  return <Link className={buttonVariants({ variant, size, className })} {...props} />
}

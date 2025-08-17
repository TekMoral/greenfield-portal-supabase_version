import React from 'react';

const Button = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  loadingText,
  icon,
  loadingIcon,
  ...props
}) => {
  // Base styles
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed';
  
  // Size variants
  const sizeStyles = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  };

  // Color variants
  const variantStyles = {
    primary: {
      normal: 'text-white bg-blue-600 border border-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      disabled: 'text-gray-400 bg-gray-100 border border-gray-200 opacity-75'
    },
    secondary: {
      normal: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-gray-500',
      disabled: 'text-gray-400 bg-gray-100 border border-gray-200 opacity-75'
    },
    success: {
      normal: 'text-white bg-green-600 border border-green-600 hover:bg-green-700 focus:ring-green-500',
      disabled: 'text-gray-400 bg-gray-100 border border-gray-200 opacity-75'
    },
    danger: {
      normal: 'text-red-700 bg-red-50 border border-red-300 hover:bg-red-100 focus:ring-red-500',
      disabled: 'text-gray-400 bg-gray-100 border border-gray-200 opacity-75'
    },
    warning: {
      normal: 'text-yellow-700 bg-yellow-50 border border-yellow-300 hover:bg-yellow-100 focus:ring-yellow-500',
      disabled: 'text-gray-400 bg-gray-100 border border-gray-200 opacity-75'
    },
    ghost: {
      normal: 'text-gray-700 bg-transparent border border-transparent hover:bg-gray-100 focus:ring-gray-500',
      disabled: 'text-gray-400 bg-transparent opacity-50'
    }
  };

  // Determine if button should be disabled
  const isDisabled = disabled || loading;

  // Get appropriate styles
  const currentVariantStyles = variantStyles[variant] || variantStyles.primary;
  const colorStyles = isDisabled ? currentVariantStyles.disabled : currentVariantStyles.normal;

  // Default loading spinner
  const defaultLoadingIcon = (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  // Combine all styles
  const buttonStyles = `${baseStyles} ${sizeStyles[size]} ${colorStyles} ${className}`;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={buttonStyles}
      {...props}
    >
      {loading ? (
        <>
          <span className="mr-2">
            {loadingIcon || defaultLoadingIcon}
          </span>
          {loadingText || children}
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
// Standardized Color Palette for Greenfield College
// This ensures consistent branding across all public pages

export const COLORS = {
  // Primary Brand Colors
  primary: {
    slate: {
      50: 'slate-50',
      100: 'slate-100', 
      200: 'slate-200',
      300: 'slate-300',
      400: 'slate-400',
      500: 'slate-500',
      600: 'slate-600',
      700: 'slate-700',
      800: 'slate-800',
      900: 'slate-900'
    },
    green: {
      50: 'emerald-50',
      100: 'emerald-100',
      200: 'emerald-200', 
      300: 'emerald-300',
      400: 'emerald-400',
      500: 'emerald-500',
      600: 'emerald-600',
      700: 'emerald-700',
      800: 'emerald-800',
      900: 'emerald-900'
    }
  },

  // Accent Colors
  accent: {
    gold: {
      50: 'amber-50',
      100: 'amber-100',
      200: 'amber-200',
      300: 'amber-300', 
      400: 'amber-400',
      500: 'amber-500',
      600: 'amber-600',
      700: 'amber-700',
      800: 'amber-800',
      900: 'amber-900'
    },
    teal: {
      50: 'teal-50',
      100: 'teal-100',
      200: 'teal-200',
      300: 'teal-300',
      400: 'teal-400', 
      500: 'teal-500',
      600: 'teal-600',
      700: 'teal-700',
      800: 'teal-800',
      900: 'teal-900'
    }
  },

  // Neutral Colors
  neutral: {
    white: 'white',
    gray: {
      50: 'gray-50',
      100: 'gray-100',
      200: 'gray-200',
      300: 'gray-300',
      400: 'gray-400',
      500: 'gray-500',
      600: 'gray-600',
      700: 'gray-700',
      800: 'gray-800',
      900: 'gray-900'
    }
  }
};

// Component-specific color mappings
export const COMPONENT_COLORS = {
  // Navigation
  nav: {
    background: 'bg-slate-800',
    backgroundScrolled: 'bg-slate-800/95',
    links: 'text-slate-100 hover:text-emerald-200',
    logo: 'text-slate-100 hover:text-emerald-200'
  },

  // Section Headings
  headings: {
    primary: 'text-slate-800',
    accent: 'text-emerald-600',
    gradient: 'bg-gradient-to-r from-slate-800 to-slate-700 bg-clip-text text-transparent',
    accentGradient: 'bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent',
    goldGradient: 'bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent'
  },

  // CTA Buttons
  buttons: {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    secondary: 'bg-white border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50',
    accent: 'bg-amber-500 hover:bg-amber-600 text-slate-900',
    ghost: 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
  },

  // Hover States
  hover: {
    emerald: 'hover:text-emerald-600 hover:border-emerald-300',
    teal: 'hover:text-teal-600 hover:border-teal-300',
    amber: 'hover:text-amber-600 hover:border-amber-300',
    slate: 'hover:text-slate-700 hover:border-slate-300'
  },

  // Backgrounds
  backgrounds: {
    primary: 'bg-white',
    secondary: 'bg-gray-50',
    accent: 'bg-emerald-50',
    gradient: 'bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50',
    hero: 'bg-gradient-to-br from-slate-600 via-slate-500 to-emerald-600'
  },

  // Status Colors
  status: {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800', 
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-slate-50 border-slate-200 text-slate-800'
  },

  // Section Tags/Badges
  badges: {
    emerald: 'bg-emerald-100 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-100 border-amber-200 text-amber-700',
    slate: 'bg-slate-100 border-slate-200 text-slate-700',
    teal: 'bg-teal-100 border-teal-200 text-teal-700'
  }
};

// Utility functions for consistent color application
export const getButtonClasses = (variant = 'primary') => {
  const baseClasses = 'px-8 py-4 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl';
  return `${baseClasses} ${COMPONENT_COLORS.buttons[variant]}`;
};

export const getHeadingClasses = (variant = 'primary') => {
  const baseClasses = 'font-black';
  return `${baseClasses} ${COMPONENT_COLORS.headings[variant]}`;
};

export const getBadgeClasses = (variant = 'emerald') => {
  const baseClasses = 'inline-block px-4 py-2 rounded-full text-sm font-semibold';
  return `${baseClasses} ${COMPONENT_COLORS.badges[variant]}`;
};

export const getCardClasses = (hover = true) => {
  const baseClasses = 'bg-white rounded-2xl p-6 shadow-lg border border-gray-200';
  const hoverClasses = hover ? 'hover:shadow-2xl transition-all duration-500 transform hover:scale-105' : '';
  return `${baseClasses} ${hoverClasses}`;
};
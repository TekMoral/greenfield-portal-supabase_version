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
    background: 'bg-[#333333]',
    backgroundScrolled: 'bg-[#333333]/95',
    links: 'text-[#F8F8F8] hover:text-[#EAEAEA]',
    logo: 'text-[#F8F8F8] hover:text-[#EAEAEA]'
  },

  // Section Headings
  headings: {
    primary: 'text-[#333333]',
    accent: 'text-[#4682B4]',
    gradient: 'bg-gradient-to-r from-[#333333] to-[#708090] bg-clip-text text-transparent',
    accentGradient: 'bg-gradient-to-r from-[#4682B4] to-[#007BFF] bg-clip-text text-transparent',
    goldGradient: 'bg-gradient-to-r from-[#4682B4] to-[#007BFF] bg-clip-text text-transparent'
  },

  // CTA Buttons
  buttons: {
    primary: 'bg-[#007BFF] hover:bg-[#0069d9] text-white',
    secondary: 'bg-white border-2 border-[#4682B4] text-[#4682B4] hover:bg-[#EAF0F7]',
    accent: 'bg-[#C70039] hover:bg-[#A00030] text-white',
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
    primary: 'bg-[#F8F8F8]',
    secondary: 'bg-[#EAEAEA]',
    accent: 'bg-[#F0F6FB]',
    gradient: 'bg-gradient-to-br from-[#F8F8F8] via-[#EAEAEA] to-[#F8F8F8]',
    hero: 'bg-gradient-to-br from-[#333333] via-[#2b2b2b] to-[#333333]'
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
    brand: 'bg-[#EAF0F7] border-[#C9D9E7] text-[#4682B4]',
    secondary: 'bg-[#E0F2F2] border-[#9FD3D3] text-[#008080]',
    accent: 'bg-[#FFEAF0] border-[#FFC9D5] text-[#C70039]',
    neutral: 'bg-[#F0F0F0] border-[#DCDCDC] text-[#333333]',
    // Legacy keys mapped to new palette for backward compatibility
    emerald: 'bg-[#EAF0F7] border-[#C9D9E7] text-[#4682B4]',
    amber: 'bg-[#E0F2F2] border-[#9FD3D3] text-[#008080]',
    slate: 'bg-[#F0F0F0] border-[#DCDCDC] text-[#333333]',
    teal: 'bg-[#E0F2F2] border-[#9FD3D3] text-[#008080]'
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

// Centralized icon colors to ensure consistent, professional look across public pages
export const ICON_COLORS = {
  primary: 'text-[#4682B4]', // Steel Blue - brand accent
  accent: 'text-[#007BFF]',  // Bright Blue - secondary accent
  onDark: 'text-white',      // Icons on dark backgrounds
  muted: 'text-slate-500'    // Muted/secondary icons
};

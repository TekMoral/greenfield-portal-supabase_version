export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    // Custom responsive breakpoints
    // Base (no prefix): 0–375px (covers small phones 320–375px)
    screens: {
      sm: '376px',   // 376–414px → medium/large phones
      md: '415px',   // 415–768px → phablets & small tablets
      lg: '769px',   // 769–1024px → standard tablets
      xl: '1025px',  // 1025px+ → desktops
      '2xl': '1440px' // optional large desktops
    },
    extend: {},
  },
  plugins: [],
}

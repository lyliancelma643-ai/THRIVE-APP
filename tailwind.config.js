/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          background: '#1b263b',
          accent: '#c5a059',
        },
        secondary: {
          accent: '#8f9779',
        },
        content: {
          background: '#101624',
        },
        surface: {
          elevated: '#151c2b',
        },
        text: {
          primary: '#ffffff',
          muted: '#cfd5e5',
          subtle: '#8f9779',
        },
        danger: '#ff4b4b',
        success: '#3ddc84'
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['SF Pro', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

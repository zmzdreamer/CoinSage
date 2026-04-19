export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        apple: {
          bg: '#F5F5F7',
          surface: '#FFFFFF',
          primary: '#1D1D1F',
          secondary: '#6E6E73',
          blue: '#0071E3',
          green: '#34C759',
          red: '#FF3B30',
          orange: '#FF9F0A',
        },
      },
      fontFamily: {
        apple: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Helvetica Neue"', 'sans-serif'],
      },
    },
  },
}

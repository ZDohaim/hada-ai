module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Scan all JSX/JS files for Tailwind classes
  ],
  theme: {
    extend: {
      colors: {
      darkBrown: '#3E2723',
      tan: '#D4A373',
      mediumBrown: '#8D6E63',
      softYellow: '#FFE0B2',
      lightYellow: '#FFF3E0',
    },
  },
},
  plugins: [],
};

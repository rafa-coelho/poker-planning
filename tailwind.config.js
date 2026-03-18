/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    "bg-purple-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-pink-500",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

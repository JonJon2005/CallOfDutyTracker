/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "cod-orange": "#E18104",
        "cod-bronze": "#825213",
        "cod-charcoal": "#222222",
        "cod-charcoal-dark": "#191919",
        "cod-charcoal-light": "#2d2d2d",
        "cod-navy": "#113155",
        "cod-blue": "#003F87",
      },
      boxShadow: {
        panel: "0 26px 52px rgba(0, 0, 0, 0.35)",
      },
    },
  },
  plugins: [],
};

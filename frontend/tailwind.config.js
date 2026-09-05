/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        foreground: 'var(--odoo-text)',
        surface: 'var(--pp-soft)',
        background: 'var(--odoo-bg)',
        card: 'var(--odoo-white)',
        border: 'var(--odoo-border)',
        primary: {
          DEFAULT: 'rgb(var(--pp-primary-rgb) / <alpha-value>)',
          hover: 'var(--pp-primary-dark)',
        },
        muted: 'var(--odoo-text-muted)',
        success: 'rgb(var(--pp-success-rgb) / <alpha-value>)',
        warning: 'rgb(var(--pp-accent-rgb) / <alpha-value>)',
        danger: 'rgb(var(--pp-danger-rgb) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

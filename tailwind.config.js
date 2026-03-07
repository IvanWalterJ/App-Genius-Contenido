/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./App.tsx",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./services/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                brand: ['Outfit', 'sans-serif'],
                modern: ['Inter', 'sans-serif'],
            },
            colors: {
                'brand-yellow': '#facc15',
                'deep-bg': '#121212',
                'deep-surface': '#1e1e1e',
                'accent-primary': '#f97316',   // Orange
                'accent-secondary': '#f59e0b', // Amber
                'bone-white': '#F5F5F0',       // Off-white
            }
        },
    },
    plugins: [],
}

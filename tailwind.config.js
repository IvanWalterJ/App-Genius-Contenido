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
                'deep-bg': '#030014',
                'deep-surface': '#0a0521',
                'accent-violet': '#8b5cf6',
                'accent-cyan': '#06b6d4',
            }
        },
    },
    plugins: [],
}

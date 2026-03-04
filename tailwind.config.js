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
            }
        },
    },
    plugins: [],
}

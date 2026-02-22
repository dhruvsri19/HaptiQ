/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                syne: ['Syne', 'sans-serif'],
                dm: ['DM Sans', 'sans-serif'],
            },
            colors: {
                'deep': '#0a0a14',
                'mid': '#0f0f1e',
                'accent-primary': '#6c63ff',
                'accent-secondary': '#00d9a3',
                'accent-warm': '#ff6b6b',
            }
        },
    },
    plugins: [],
}

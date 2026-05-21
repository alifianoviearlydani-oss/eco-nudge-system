/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Kita daftarkan palet warna ijo hutan pilihanmu di sini biar bisa dipanggil otomatis
        forest: {
          dark: '#1F3E2E',
          medium: '#29513C',
          light: '#3D795A',
          accent: '#60AF86',
          soft: '#D7EBE1',
        }
      }
    },
  },
  plugins: [],
}
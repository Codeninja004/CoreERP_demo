module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        primary: { 50:'#EEF5FD',100:'#D9E8F9',200:'#B6D2F3',300:'#86B4EA',400:'#5795DF',500:'#3478D4',600:'#2A66BA',700:'#225297',800:'#1F4378',900:'#1D3964' },
        ink: { 900:'#16191D',800:'#23272C',700:'#3A3F46',600:'#525861',500:'#6B717A',400:'#8C9199',300:'#B5B9C0',200:'#D6D9DD' },
        surface: '#F6F7F9',
        line: '#E5E7EB',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.05)',
        pop: '0 10px 30px -8px rgba(16,24,40,0.18), 0 2px 6px rgba(16,24,40,0.06)',
      },
      borderRadius: { lg: '8px', xl: '10px', '2xl': '12px' },
      fontSize: { '2xs': ['11px', '16px'] },
    },
  },
  plugins: [],
};

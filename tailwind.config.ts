import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light Mode Colors
        light: {
          DEFAULT: '#FDF6E3',     // 메인 배경색
          title: '#E5E7EB',       // 테두리
          text: '#2C3E50',        // 진한 회색
          subtext: '#4B5563'      // 중간 톤 회색
        },
        // Gold Gradient Colors
        gold: {
          start: '#FFD700',       // 시작색
          end: '#EBD671',         // 종료색
        },
        // Dark Mode Colors
        dark: {
          DEFAULT: '#1E1E2E',     // 메인 배경
          header: '#252538',      // 헤더 배경
          gold: {
            DEFAULT: '#DFC255',   // 차분한 골드
            dark: '#C4A845',      // 진이 감있는 골드
          },
          text: '#E5E7EB'         // 바른 텍스트
        }
      },
      screens: {
        'mobile': '360px', // 모바일 (360px~)
        'tablet': '768px', // 태블릿 (768px~)
        'laptop': '1024px', // 랩톱 (1024px~)
      }
    },
  },
  plugins: [],
  darkMode: 'class',
} satisfies Config

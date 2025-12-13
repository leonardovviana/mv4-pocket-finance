import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // iOS Colors
        ios: {
          blue: "hsl(var(--ios-blue))",
          red: "hsl(var(--ios-red))",
          green: "hsl(var(--ios-green))",
          orange: "hsl(var(--ios-orange))",
          purple: "hsl(var(--ios-purple))",
          pink: "hsl(var(--ios-pink))",
          teal: "hsl(var(--ios-teal))",
          yellow: "hsl(var(--ios-yellow))",
          gray: {
            1: "hsl(var(--ios-gray-1))",
            2: "hsl(var(--ios-gray-2))",
            3: "hsl(var(--ios-gray-3))",
            4: "hsl(var(--ios-gray-4))",
            5: "hsl(var(--ios-gray-5))",
            6: "hsl(var(--ios-gray-6))",
          },
        },
        tabBar: {
          DEFAULT: "hsl(var(--tab-bar))",
          border: "hsl(var(--tab-bar-border))",
          inactive: "hsl(var(--tab-inactive))",
          active: "hsl(var(--tab-active))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        ios: "12px",
        "ios-lg": "16px",
        "ios-xl": "20px",
      },
      fontSize: {
        "ios-largetitle": ["34px", { lineHeight: "41px", fontWeight: "700" }],
        "ios-title1": ["28px", { lineHeight: "34px", fontWeight: "700" }],
        "ios-title2": ["22px", { lineHeight: "28px", fontWeight: "700" }],
        "ios-title3": ["20px", { lineHeight: "25px", fontWeight: "600" }],
        "ios-headline": ["17px", { lineHeight: "22px", fontWeight: "600" }],
        "ios-body": ["17px", { lineHeight: "22px", fontWeight: "400" }],
        "ios-callout": ["16px", { lineHeight: "21px", fontWeight: "400" }],
        "ios-subheadline": ["15px", { lineHeight: "20px", fontWeight: "400" }],
        "ios-footnote": ["13px", { lineHeight: "18px", fontWeight: "400" }],
        "ios-caption1": ["12px", { lineHeight: "16px", fontWeight: "400" }],
        "ios-caption2": ["11px", { lineHeight: "13px", fontWeight: "400" }],
      },
      spacing: {
        "ios-sm": "8px",
        "ios-md": "16px",
        "ios-lg": "20px",
        "ios-xl": "24px",
        "safe-bottom": "env(safe-area-inset-bottom, 20px)",
        "safe-top": "env(safe-area-inset-top, 20px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "ios-bounce": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.97)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "ios-bounce": "ios-bounce 0.2s ease-in-out",
      },
      boxShadow: {
        "ios-sm": "0 1px 2px hsl(0 0% 0% / 0.04)",
        "ios-md": "0 4px 12px hsl(0 0% 0% / 0.08)",
        "ios-lg": "0 8px 24px hsl(0 0% 0% / 0.12)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

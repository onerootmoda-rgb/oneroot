// Shared Tailwind config — loaded before CDN on all public pages
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#000000", "on-primary": "#ffffff",
        "primary-container": "#1b1b1b", "on-primary-container": "#848484",
        "primary-fixed": "#e2e2e2", "primary-fixed-dim": "#c6c6c6",
        "on-primary-fixed": "#1b1b1b", "on-primary-fixed-variant": "#474747",
        "secondary": "#5d5f5f", "on-secondary": "#ffffff",
        "secondary-container": "#dfe0e0", "on-secondary-container": "#616363",
        "secondary-fixed": "#e2e2e2", "secondary-fixed-dim": "#c6c6c7",
        "on-secondary-fixed": "#1a1c1c", "on-secondary-fixed-variant": "#454747",
        "tertiary": "#000000", "on-tertiary": "#ffffff",
        "tertiary-container": "#1a1b1f", "on-tertiary-container": "#838388",
        "tertiary-fixed": "#e3e2e7", "tertiary-fixed-dim": "#c6c6cb",
        "on-tertiary-fixed": "#1a1b1f", "on-tertiary-fixed-variant": "#46464b",
        "error": "#ba1a1a", "on-error": "#ffffff",
        "error-container": "#ffdad6", "on-error-container": "#93000a",
        "background": "#f9f9fe", "on-background": "#1a1c1f",
        "surface": "#f9f9fe", "on-surface": "#1a1c1f",
        "surface-variant": "#e2e2e7", "on-surface-variant": "#4c4546",
        "surface-dim": "#d9dade", "surface-bright": "#f9f9fe",
        "surface-container-lowest": "#ffffff", "surface-container-low": "#f3f3f8",
        "surface-container": "#ededf2", "surface-container-high": "#e8e8ed",
        "surface-container-highest": "#e2e2e7",
        "outline": "#7e7576", "outline-variant": "#cfc4c5",
        "inverse-surface": "#2e3034", "inverse-on-surface": "#f0f0f5",
        "inverse-primary": "#c6c6c6", "surface-tint": "#5e5e5e"
      },
      borderRadius: { DEFAULT: "0px", lg: "0px", xl: "0px", full: "9999px" },
      spacing: {
        xs: "8px", sm: "16px", md: "24px", lg: "48px",
        xl: "80px", gutter: "24px", base: "4px", "container-max": "1440px"
      },
      fontFamily: {
        "body-md":           ["Hanken Grotesk"],
        "body-lg":           ["Hanken Grotesk"],
        "display-lg":        ["Montserrat"],
        "headline-lg":       ["Montserrat"],
        "headline-xl":       ["Montserrat"],
        "headline-lg-mobile":["Montserrat"],
        "label-caps":        ["JetBrains Mono"]
      },
      fontSize: {
        "display-lg":        ["80px", { lineHeight:"80px",  letterSpacing:"-0.04em", fontWeight:"900" }],
        "headline-xl":       ["48px", { lineHeight:"52px",  letterSpacing:"-0.02em", fontWeight:"800" }],
        "headline-lg":       ["32px", { lineHeight:"38px",  fontWeight:"700" }],
        "headline-lg-mobile":["28px", { lineHeight:"32px",  fontWeight:"700" }],
        "body-lg":           ["18px", { lineHeight:"28px",  fontWeight:"400" }],
        "body-md":           ["16px", { lineHeight:"24px",  fontWeight:"400" }],
        "label-caps":        ["12px", { lineHeight:"16px",  letterSpacing:"0.1em", fontWeight:"500" }]
      }
    }
  }
};

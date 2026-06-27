---
name: Monochrome Urbanity
colors:
  surface: '#f9f9fe'
  surface-dim: '#d9dade'
  surface-bright: '#f9f9fe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f8'
  surface-container: '#ededf2'
  surface-container-high: '#e8e8ed'
  surface-container-highest: '#e2e2e7'
  on-surface: '#1a1c1f'
  on-surface-variant: '#4c4546'
  inverse-surface: '#2e3034'
  inverse-on-surface: '#f0f0f5'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#5d5f5f'
  on-secondary: '#ffffff'
  secondary-container: '#dfe0e0'
  on-secondary-container: '#616363'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1a1b1f'
  on-tertiary-container: '#838388'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#e3e2e7'
  tertiary-fixed-dim: '#c6c6cb'
  on-tertiary-fixed: '#1a1b1f'
  on-tertiary-fixed-variant: '#46464b'
  background: '#f9f9fe'
  on-background: '#1a1c1f'
  surface-variant: '#e2e2e7'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 80px
    fontWeight: '900'
    lineHeight: 80px
    letterSpacing: -0.04em
  headline-xl:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 52px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.1em
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 48px
  xl: 80px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style

The design system is rooted in the "Elevated Streetwear" aesthetic—a fusion of high-fashion minimalism and raw urban grit. The brand personality is confident, exclusive, and architectural. It targets a discerning audience that values structural integrity and "quiet luxury" within streetwear culture.

The visual style is a blend of **Minimalism** and **Brutalism**. It utilizes expansive white space (or deep black voids) contrasted against sharp, heavy-weight typography. The intent is to evoke a sense of permanence and "premium weight," similar to a high-end gallery or a limited-edition lookbook. Visual interest is generated through scale, stark contrast, and precise alignment rather than decorative flourishes.

## Colors

The palette is strictly achromatic, mirroring the "One Root" logo. Black is used as the primary driver for high-impact elements, while white serves as the foundational canvas to maintain a clean, editorial feel.

- **Primary:** Absolute Black (#000000) for headers, primary actions, and branding.
- **Secondary:** Stark White (#FFFFFF) for backgrounds and inverted text.
- **Cool Greys:** Used sparingly for metadata, borders, and disabled states to maintain depth without introducing warmth.
- **High Contrast:** The relationship between primary and secondary should always maintain a high contrast ratio to ensure a bold, legible presence.

## Typography

Typography is the central expressive element of this design system. We use a tri-font strategy to balance impact, readability, and the "urban edge."

1.  **Montserrat (Headlines):** Used in heavy weights (700-900) to create a sense of structural authority. Tight letter-spacing on display sizes mimics high-end editorial layouts.
2.  **Hanken Grotesk (Body):** A modern, sharp sans-serif that ensures legibility in product descriptions and long-form content while maintaining a tech-forward feel.
3.  **JetBrains Mono (Labels/Technical):** Used for sizes, SKUs, price points, and "EST MMXXV" style details to nod to the industrial/streetwear aesthetic.

All headlines should favor sentence case or all-caps depending on the specific component's hierarchy.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy for desktop to maintain a gallery-like structure, transitioning to a fluid model for mobile.

- **Desktop (1440px+):** 12-column grid with wide 48px margins. Content is often offset to create "asymmetric balance," a hallmark of modern streetwear lookbooks.
- **Tablet (768px - 1439px):** 8-column grid with 24px margins.
- **Mobile (Under 768px):** 4-column grid with 16px margins. 

Spacing units are strictly based on a 4px baseline. Large vertical gaps (`xl`) are encouraged between sections to allow the brand imagery to "breathe" and feel premium.

## Elevation & Depth

To maintain the minimalist and "flat-premium" aesthetic, this design system avoids traditional drop shadows and blurs.

- **Flat Architecture:** Depth is communicated through **Tonal Layers** and **Bold Borders**.
- **The "Stack" Effect:** Elements that appear "above" the base layer use solid black backgrounds with white text, or 1px solid black borders (#000000).
- **Hard Edges:** When an overlay is required (e.g., a cart drawer or modal), it should have a 1px solid black border with 0 blur, creating a sharp, physical cutout look rather than a soft shadow.
- **Negative Space:** Use high-contrast color blocks to separate sections rather than gradients or shadows.

## Shapes

The shape language is strictly **Sharp**. 

- All buttons, input fields, and containers utilize 0px border-radius. 
- The 90-degree angle reinforces the architectural, brutalist nature of the brand.
- Product cards should not have borders; they should rely on the imagery's edge or a subtle light-grey background fill to define their boundaries.

## Components

### Buttons
- **Primary:** Solid black background, white JetBrains Mono text (all caps), 0px radius. Hover state: White background with 1px black border and black text.
- **Secondary:** Transparent background, 1px black border, black text.

### Input Fields
- Underline-only or 1px bordered boxes. No background fill unless in focus. Focus state uses a thicker 2px bottom border.

### Chips/Tags
- Small JetBrains Mono text. Rectangular with 1px borders. Used for "New Arrival," "Sold Out," or "Limited."

### Cards
- **Product Cards:** Full-width imagery with minimal metadata below. Prices should be in JetBrains Mono. Use a "quick add" button that only appears on hover (desktop).

### Navigation
- Minimalist top bar. Centered logo. Navigation links in Hanken Grotesk (Medium) with a simple underline animation on hover.

### Lists
- Clean, 1px horizontal dividers. No vertical dividers. Ample padding (md-lg) between line items to ensure a premium, uncrowded feel.
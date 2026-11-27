'use strict';

// Custom Duotone Geometric SVG Icon Library for Nadufm Portal
// Each entry contains inner SVG shapes on a 24x24 viewBox using currentColor.

export const ICONS = {
  'grid-menu': `
    <rect x="3" y="3" width="7.5" height="7.5" rx="2.2" fill="currentColor" fill-opacity="0.26" stroke="currentColor" stroke-width="1.85"/>
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="2.2" stroke="currentColor" stroke-width="1.85"/>
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="2.2" stroke="currentColor" stroke-width="1.85"/>
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2.2" fill="currentColor" fill-opacity="0.26" stroke="currentColor" stroke-width="1.85"/>
  `,
  'home': `
    <path d="M4 10.5L12 3.8L20 10.5V19.2C20 19.86 19.46 20.4 18.8 20.4H5.2C4.54 20.4 4 19.86 4 19.2V10.5Z" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <path d="M9.5 20.4V14.2C9.5 13.54 10.04 13 10.7 13H13.3C13.96 13 14.5 13.54 14.5 14.2V20.4" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
  `,
  'search': `
    <circle cx="10.8" cy="10.8" r="6.8" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.85"/>
    <path d="M16 16L20.5 20.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  `,
  'menu': `
    <path d="M4 6.5H20M4 12H16.5M4 17.5H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  `,
  'close': `
    <path d="M6.5 6.5L17.5 17.5M17.5 6.5L6.5 17.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  `,
  'chevron-right': `
    <path d="M9 5.5L15.5 12L9 18.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  'refresh': `
    <path d="M20 11A8 8 0 0 0 6.3 5.7L4 8" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M4 4V8H8" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M4 13A8 8 0 0 0 17.7 18.3L20 16" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M20 20V16H16" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  'external-link': `
    <path d="M14 4H20V10" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M10.5 13.5L20 4" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
    <path d="M18 13.5V18.2C18 19.2 17.2 20 16.2 20H5.8C4.8 20 4 19.2 4 18.2V7.8C4 6.8 4.8 6 5.8 6H10.5" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  'logout': `
    <path d="M10 4.5H6C4.9 4.5 4 5.4 4 6.5V17.5C4 18.6 4.9 19.5 6 19.5H10" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
    <path d="M15.5 8L20 12L15.5 16" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9.5 12H19.5" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
  `,
  'mosque': `
    <path d="M12 2.8V4.6" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
    <path d="M7 12C7 8.4 9.6 6 12 4.6C14.4 6 17 8.4 17 12H7Z" fill="currentColor" fill-opacity="0.26" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <path d="M3.5 12H20.5V20H3.5V12Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <path d="M10.2 20V16.2C10.2 15.2 11 14.4 12 14.4C13 14.4 13.8 15.2 13.8 16.2V20" stroke="currentColor" stroke-width="1.85"/>
    <path d="M4.5 9V12M19.5 9V12" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
  `,
  'building': `
    <path d="M4.5 20V7.5L12 3.5L19.5 7.5V20H4.5Z" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <path d="M9.5 20V15H14.5V20" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <circle cx="12" cy="9.5" r="1.4" fill="currentColor"/>
    <path d="M3 20H21" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
  `,
  'chalkboard': `
    <rect x="3" y="4.5" width="18" height="12" rx="2.2" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.85"/>
    <path d="M7 9.5H13.5M7 12.8H11" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
    <path d="M8.5 16.5L6.8 20.5M15.5 16.5L17.2 20.5M12 16.5V20.5" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
  `,
  'users': `
    <circle cx="9.2" cy="8.2" r="3.2" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1.85"/>
    <path d="M3.5 19.2C3.5 15.9 6.1 13.8 9.2 13.8C12.3 13.8 14.9 15.9 14.9 19.2" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
    <circle cx="16.4" cy="9.2" r="2.4" stroke="currentColor" stroke-width="1.8"/>
    <path d="M16.4 14.2C18.6 14.4 20.5 16.1 20.5 19.2" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
  `,
  'mic': `
    <rect x="8.8" y="3.5" width="6.4" height="10.2" rx="3.2" fill="currentColor" fill-opacity="0.26" stroke="currentColor" stroke-width="1.85"/>
    <path d="M5.5 11.2C5.5 14.8 8.4 17.5 12 17.5C15.6 17.5 18.5 14.8 18.5 11.2" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
    <path d="M12 17.5V20.8M8.8 20.8H15.2" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
  `,
  'tie-user': `
    <circle cx="12" cy="7.5" r="3.5" fill="currentColor" fill-opacity="0.26" stroke="currentColor" stroke-width="1.85"/>
    <path d="M5 19.8C5 16.1 8.1 13.8 12 13.8C15.9 13.8 19 16.1 19 19.8" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
    <path d="M12 13.8L10.8 17.2L12 19.2L13.2 17.2L12 13.8Z" fill="currentColor"/>
  `,
  'landmark': `
    <path d="M3.5 9.5L12 4L20.5 9.5H3.5Z" fill="currentColor" fill-opacity="0.26" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <path d="M6.5 9.5V17.5M10.2 9.5V17.5M13.8 9.5V17.5M17.5 9.5V17.5" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
    <path d="M3.5 20H20.5M4.8 17.5H19.2" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
  `,
  'phone': `
    <path d="M6.4 4.2H9.6L11.2 8.2L9.2 9.8C10.3 12 12 13.7 14.2 14.8L15.8 12.8L19.8 14.4V17.6C19.8 18.8 18.8 19.8 17.6 19.8C10.2 19.4 4.6 13.8 4.2 6.4C4.2 5.2 5.2 4.2 6.4 4.2Z" fill="currentColor" fill-opacity="0.24" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
  `,
  'phone-wave': `
    <path d="M5.8 4.8H8.8L10.3 8.4L8.5 9.9C9.5 12 11.2 13.6 13.3 14.7L14.8 12.9L18.4 14.4V17.4C18.4 18.5 17.5 19.4 16.4 19.4C9.5 19 4.2 13.7 3.8 6.8C3.8 5.7 4.7 4.8 5.8 4.8Z" fill="currentColor" fill-opacity="0.24" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <path d="M14.5 5.2C16.8 5.6 18.6 7.4 19 9.7" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
    <path d="M14.2 8.3C15.1 8.5 15.7 9.1 15.9 10" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
  `,
  'map-pin': `
    <path d="M12 21C12 21 18.5 15.1 18.5 10.2C18.5 6.6 15.6 3.8 12 3.8C8.4 3.8 5.5 6.6 5.5 10.2C5.5 15.1 12 21 12 21Z" fill="currentColor" fill-opacity="0.24" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <circle cx="12" cy="10.2" r="2.4" fill="currentColor"/>
  `,
  'mail': `
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.4" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.85"/>
    <path d="M4.5 7L12 12.6L19.5 7" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  'award': `
    <circle cx="12" cy="9.2" r="5.5" fill="currentColor" fill-opacity="0.26" stroke="currentColor" stroke-width="1.85"/>
    <path d="M8.5 13.8L7.2 20.6L12 18.3L16.8 20.6L15.5 13.8" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <circle cx="12" cy="9.2" r="2" fill="currentColor"/>
  `,
  'clock': `
    <circle cx="12" cy="12" r="8.5" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.85"/>
    <path d="M12 7.2V12.2L15.4 14.2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  'book-open': `
    <path d="M12 6.2C9.8 4.7 6.8 4.3 4 5V18.2C6.8 17.5 9.8 17.9 12 19.4C14.2 17.9 17.2 17.5 20 18.2V5C17.2 4.3 14.2 4.7 12 6.2Z" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <path d="M12 6.2V19.4" stroke="currentColor" stroke-width="1.85"/>
  `,
  'bell': `
    <path d="M18 15.8V10.5C18 7.2 15.3 4.5 12 4.5C8.7 4.5 6 7.2 6 10.5V15.8L4.2 17.8H19.8L18 15.8Z" fill="currentColor" fill-opacity="0.24" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <path d="M9.8 18C10.1 19.3 11 20.2 12 20.2C13 20.2 13.9 19.3 14.2 18" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
    <path d="M12 3V4.5" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
  `,
  'calendar': `
    <rect x="3.8" y="5.5" width="16.4" height="14.5" rx="2.5" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.85"/>
    <path d="M3.8 10.2H20.2" stroke="currentColor" stroke-width="1.85"/>
    <path d="M8.2 3.5V7M15.8 3.5V7" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
    <circle cx="8.5" cy="14.2" r="1.1" fill="currentColor"/>
    <circle cx="12" cy="14.2" r="1.1" fill="currentColor"/>
    <circle cx="15.5" cy="14.2" r="1.1" fill="currentColor"/>
  `,
  'calendar-off': `
    <rect x="3.8" y="5.5" width="16.4" height="14.5" rx="2.5" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.85"/>
    <path d="M3.8 10.2H20.2" stroke="currentColor" stroke-width="1.85"/>
    <path d="M8.2 3.5V7M15.8 3.5V7" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M12 13.2L12.7 14.6L14.2 14.8L13.1 15.8L13.4 17.3L12 16.6L10.6 17.3L10.9 15.8L9.8 14.8L11.3 14.6L12 13.2Z" fill="currentColor"/>
  `,
  'grad-cap': `
    <path d="M2.8 9.2L12 4.8L21.2 9.2L12 13.6L2.8 9.2Z" fill="currentColor" fill-opacity="0.28" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <path d="M6.4 11.2V16.2C6.4 17.9 8.9 19.3 12 19.3C15.1 19.3 17.6 17.9 17.6 16.2V11.2" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M20.2 10V15.5" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
  `,
  'user-plus': `
    <circle cx="9.8" cy="8.2" r="3.4" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1.85"/>
    <path d="M3.5 19.5C3.5 16 6.3 13.8 9.8 13.8C13.3 13.8 16.1 16 16.1 19.5" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
    <path d="M18.2 8.5V13.5M15.7 11H20.7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  `,
  'bar-chart': `
    <rect x="4" y="13" width="3.8" height="7" rx="1.1" fill="currentColor" fill-opacity="0.26" stroke="currentColor" stroke-width="1.85"/>
    <rect x="10.1" y="5.5" width="3.8" height="14.5" rx="1.1" fill="currentColor" fill-opacity="0.34" stroke="currentColor" stroke-width="1.85"/>
    <rect x="16.2" y="9.5" width="3.8" height="10.5" rx="1.1" fill="currentColor" fill-opacity="0.26" stroke="currentColor" stroke-width="1.85"/>
  `,
  'id-badge': `
    <rect x="5" y="4.5" width="14" height="16" rx="2.4" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.85"/>
    <circle cx="12" cy="10.5" r="2.2" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.75"/>
    <path d="M8.5 16.8C9 15.2 10.4 14.4 12 14.4C13.6 14.4 15 15.2 15.5 16.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M9.8 3V5.5M14.2 3V5.5" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
  `,
  'id-card': `
    <rect x="3" y="5.2" width="18" height="13.6" rx="2.4" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.85"/>
    <circle cx="8.6" cy="10.8" r="1.9" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.7"/>
    <path d="M5.8 15.8C6.3 14.4 7.3 13.8 8.6 13.8C9.9 13.8 10.9 14.4 11.4 15.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M13.8 10H18.2M13.8 13.5H17.2" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
  `,
  'id-card-search': `
    <rect x="3" y="5.2" width="18" height="13.6" rx="2.4" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.85"/>
    <circle cx="10" cy="11.2" r="2.8" fill="currentColor" fill-opacity="0.28" stroke="currentColor" stroke-width="1.75"/>
    <path d="M12.2 13.4L14.8 16" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
    <path d="M15.4 9.5H18.2M15.4 12.6H18.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  `,
  'wallet': `
    <rect x="3.2" y="6" width="17.6" height="13" rx="2.6" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.85"/>
    <path d="M5.5 6L16.5 3.6C17.4 3.4 18.2 4.1 18.2 5V6" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
    <rect x="14.5" y="10.5" width="6.3" height="4.4" rx="1.4" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="1.75"/>
    <circle cx="16.8" cy="12.7" r="0.9" fill="currentColor"/>
  `,
  'clipboard-check': `
    <rect x="5" y="4.8" width="14" height="15.7" rx="2.4" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.85"/>
    <rect x="9" y="3" width="6" height="3.2" rx="1.2" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.75"/>
    <path d="M8.8 13.2L11 15.4L15.4 10.6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  'globe': `
    <circle cx="12" cy="12" r="8.5" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.85"/>
    <ellipse cx="12" cy="12" rx="3.8" ry="8.5" stroke="currentColor" stroke-width="1.7"/>
    <path d="M4 9.5H20M4 14.5H20" stroke="currentColor" stroke-width="1.7"/>
  `,
  'bank': `
    <path d="M3.5 9L12 4L20.5 9H3.5Z" fill="currentColor" fill-opacity="0.26" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <path d="M6.2 9V17.2M10 9V17.2M14 9V17.2M17.8 9V17.2" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
    <path d="M3.2 20H20.8M4.5 17.2H19.5" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
  `,
  'heart-hand': `
    <path d="M12 13.2C12 13.2 7 9.9 7 6.8C7 5.2 8.2 4 9.7 4C10.7 4 11.5 4.5 12 5.3C12.5 4.5 13.3 4 14.3 4C15.8 4 17 5.2 17 6.8C17 9.9 12 13.2 12 13.2Z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M3.5 16.5H10.5L13.5 18H19.2C19.9 18 20.4 18.6 20.2 19.3C20 19.9 19.4 20.3 18.7 20.3H10L6 19.2H3.5V16.5Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
  `,
  'file-text': `
    <path d="M6 3.8H14L18.5 8.3V19.2C18.5 19.9 17.9 20.5 17.2 20.5H6.8C6.1 20.5 5.5 19.9 5.5 19.2V4.8C5.5 4.2 5.7 3.8 6 3.8Z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <path d="M13.8 3.8V8.5H18.5" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <path d="M8.8 12.2H15.2M8.8 15.6H13.5" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
  `,
  'books': `
    <rect x="4" y="4.5" width="4.4" height="15" rx="1.2" fill="currentColor" fill-opacity="0.24" stroke="currentColor" stroke-width="1.8"/>
    <rect x="9.6" y="4.5" width="4.4" height="15" rx="1.2" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.8"/>
    <path d="M15.4 5.2L19.6 4.4L21 18.8L16.8 19.6L15.4 5.2Z" fill="currentColor" fill-opacity="0.28" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
  `,
  'server': `
    <rect x="3.8" y="4.5" width="16.4" height="6" rx="1.8" fill="currentColor" fill-opacity="0.24" stroke="currentColor" stroke-width="1.85"/>
    <rect x="3.8" y="13.5" width="16.4" height="6" rx="1.8" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.85"/>
    <circle cx="7.4" cy="7.5" r="1" fill="currentColor"/>
    <circle cx="7.4" cy="16.5" r="1" fill="currentColor"/>
    <path d="M11.5 7.5H16.8M11.5 16.5H16.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  `,
  'calculator': `
    <rect x="5" y="3.5" width="14" height="17" rx="2.4" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.85"/>
    <rect x="7.8" y="6.2" width="8.4" height="3.4" rx="0.9" fill="currentColor" fill-opacity="0.32" stroke="currentColor" stroke-width="1.6"/>
    <circle cx="8.5" cy="13" r="1" fill="currentColor"/>
    <circle cx="12" cy="13" r="1" fill="currentColor"/>
    <circle cx="15.5" cy="13" r="1" fill="currentColor"/>
    <circle cx="8.5" cy="16.5" r="1" fill="currentColor"/>
    <circle cx="12" cy="16.5" r="1" fill="currentColor"/>
    <circle cx="15.5" cy="16.5" r="1" fill="currentColor"/>
  `,
  'printer': `
    <path d="M7 8.5V4.2H17V8.5" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <rect x="3.5" y="8.5" width="17" height="8" rx="2" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.85"/>
    <rect x="7" y="13.8" width="10" height="6.2" rx="1" fill="#ffffff" fill-opacity="0.88" stroke="currentColor" stroke-width="1.8"/>
    <circle cx="16.5" cy="11.2" r="0.9" fill="currentColor"/>
  `,
  'trophy': `
    <path d="M7.5 4.5H16.5V10.5C16.5 13 14.5 15 12 15C9.5 15 7.5 13 7.5 10.5V4.5Z" fill="currentColor" fill-opacity="0.28" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <path d="M7.5 6H4.8C4.3 6 4 6.4 4 6.9C4 9.2 5.4 10.8 7.5 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M16.5 6H19.2C19.7 6 20 6.4 20 6.9C20 9.2 18.6 10.8 16.5 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M12 15V19.5M8.5 19.5H15.5" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
  `,
  'megaphone': `
    <path d="M18.5 5.2V17.8L9.5 14H5.2C4.3 14 3.5 13.2 3.5 12.3V10.7C3.5 9.8 4.3 9 5.2 9H9.5L18.5 5.2Z" fill="currentColor" fill-opacity="0.24" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <path d="M7 14L8.6 19.2C8.8 19.8 9.4 20.1 10 20H11C11.5 19.9 11.8 19.4 11.6 18.9L10.2 14.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M20.8 9.5C21.5 10.5 21.5 12.5 20.8 13.5" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
  `,
  'coins': `
    <ellipse cx="9.8" cy="7.5" rx="5.5" ry="2.6" fill="currentColor" fill-opacity="0.28" stroke="currentColor" stroke-width="1.8"/>
    <path d="M4.3 7.5V15.5C4.3 16.9 6.8 18.1 9.8 18.1C12.8 18.1 15.3 16.9 15.3 15.5V7.5" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.8"/>
    <path d="M4.3 11.5C4.3 12.9 6.8 14.1 9.8 14.1C12.8 14.1 15.3 12.9 15.3 11.5" stroke="currentColor" stroke-width="1.75"/>
    <circle cx="16.8" cy="14.8" r="3.6" fill="currentColor" fill-opacity="0.28" stroke="currentColor" stroke-width="1.8"/>
  `,
  'pie-chart': `
    <path d="M11.2 4.2C6.8 4.6 3.5 8.3 3.5 12.8C3.5 17.5 7.3 21 12 21C16.5 21 20.2 17.7 20.6 13.3H11.2V4.2Z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <path d="M13.8 3.5C17.4 3.9 20.2 6.7 20.6 10.3H13.8V3.5Z" fill="currentColor" fill-opacity="0.38" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
  `,
  'shield-user': `
    <path d="M12 3.5L19 6.5V11.8C19 16.2 15.9 19.6 12 20.8C8.1 19.6 5 16.2 5 11.8V6.5L12 3.5Z" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <circle cx="12" cy="10" r="2.2" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.6"/>
    <path d="M8.8 16C9.4 14.6 10.6 13.9 12 13.9C13.4 13.9 14.6 14.6 15.2 16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
  `,
  'facebook': `
    <path d="M14.5 4.2H17V7.6H15C14.1 7.6 13.7 8.1 13.7 9V11H16.9L16.4 14.4H13.7V20.5H10.2V14.4H7.5V11H10.2V8.4C10.2 5.7 11.9 4.2 14.5 4.2Z" fill="currentColor" fill-opacity="0.26" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
  `,
  'youtube': `
    <rect x="2.8" y="5.5" width="18.4" height="13" rx="4" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.85"/>
    <path d="M10.2 9.2L15.6 12L10.2 14.8V9.2Z" fill="currentColor"/>
  `,
  'info': `
    <circle cx="12" cy="12" r="8.5" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.85"/>
    <path d="M12 11.2V16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <circle cx="12" cy="8.2" r="1.1" fill="currentColor"/>
  `,
  'chevron-left': `
    <path d="M15 5.5L8.5 12L15 18.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  'list-ol': `
    <path d="M10 6.5H20M10 12H20M10 17.5H20" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
    <circle cx="5.2" cy="6.5" r="1.4" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.4"/>
    <circle cx="5.2" cy="12" r="1.4" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.4"/>
    <circle cx="5.2" cy="17.5" r="1.4" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.4"/>
  `,
  'poll': `
    <rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.85"/>
    <path d="M8 15.5V12M12 15.5V8.5M16 15.5V10.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  `,
  'certificate': `
    <rect x="3.5" y="4.5" width="17" height="13" rx="2.4" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.85"/>
    <path d="M7.5 9.2H13.5M7.5 12.5H11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="16.2" cy="12.5" r="2.2" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.6"/>
    <path d="M15 14.5V19.8L16.2 18.8L17.4 19.8V14.5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
  `,
  'file-pdf': `
    <path d="M6 3.5H14L18.5 8V19.2C18.5 19.9 17.9 20.5 17.2 20.5H6.8C6.1 20.5 5.5 19.9 5.5 19.2V4.5C5.5 3.9 5.7 3.5 6 3.5Z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <path d="M13.8 3.5V8.2H18.5" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <path d="M8.4 15.2H15.6M9.5 11.8H14.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  `,
  'file-word': `
    <path d="M6 3.5H14L18.5 8V19.2C18.5 19.9 17.9 20.5 17.2 20.5H6.8C6.1 20.5 5.5 19.9 5.5 19.2V4.5C5.5 3.9 5.7 3.5 6 3.5Z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <path d="M13.8 3.5V8.2H18.5" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <path d="M8.2 12L9.8 16.5L12 13L14.2 16.5L15.8 12" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  'atom': `
    <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(45 12 12)" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.7"/>
    <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(-45 12 12)" stroke="currentColor" stroke-width="1.7"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
  `,
  'lock': `
    <rect x="4.5" y="10.5" width="15" height="9.8" rx="2.6" fill="currentColor" fill-opacity="0.24" stroke="currentColor" stroke-width="1.85"/>
    <path d="M8 10.5V7.8C8 5.5 9.8 3.8 12 3.8C14.2 3.8 16 5.5 16 7.8V10.5" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>
    <circle cx="12" cy="15.2" r="1.35" fill="currentColor"/>
  `,
  'eye': `
    <path d="M2.6 12C4.5 7.9 8 5.6 12 5.6C16 5.6 19.5 7.9 21.4 12C19.5 16.1 16 18.4 12 18.4C8 18.4 4.5 16.1 2.6 12Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <circle cx="12" cy="12" r="2.8" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="1.8"/>
  `,
  'eye-off': `
    <path d="M3.2 12C5 8.2 8.2 6 12 6C13.6 6 15.1 6.4 16.5 7.2M20.8 12C19 15.8 15.8 18 12 18C10.3 18 8.7 17.5 7.3 16.7" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M4 4L20 20" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
  `,
  'alert-circle': `
    <circle cx="12" cy="12" r="8.8" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.85"/>
    <path d="M12 7.8V13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <circle cx="12" cy="16.2" r="1.1" fill="currentColor"/>
  `,
  'camera': `
    <path d="M4.2 7.5H7.2L8.8 5H15.2L16.8 7.5H19.8C20.6 7.5 21.2 8.1 21.2 8.9V18.2C21.2 19 20.6 19.6 19.8 19.6H4.2C3.4 19.6 2.8 19 2.8 18.2V8.9C2.8 8.1 3.4 7.5 4.2 7.5Z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>
    <circle cx="12" cy="13.2" r="3.4" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="1.8"/>
    <circle cx="17.6" cy="10.2" r="0.9" fill="currentColor"/>
  `
};

export function iconSvg(name, className = 'app-svg-icon', size = 22) {
  const inner = ICONS[name] || ICONS['grid-menu'];
  return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">${inner}</svg>`;
}

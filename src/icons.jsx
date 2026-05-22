import React from 'react';

const Icon = {
  Chevron: ({ size = 18, dir = 'right', color = 'currentColor' }) => {
    const rot = { right: 0, down: 90, left: 180, up: -90 }[dir] || 0;
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ transform: `rotate(${rot}deg)` }}>
        <path d="M9 6l6 6-6 6" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  },
  Back: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M15 6l-6 6 6 6" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Dots: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="6" cy="6" r="1.5" fill={color}/><circle cx="14" cy="6" r="1.5" fill={color}/>
      <circle cx="6" cy="14" r="1.5" fill={color}/><circle cx="14" cy="14" r="1.5" fill={color}/>
    </svg>
  ),
  Search: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="6" stroke={color} strokeWidth="1.75" />
      <path d="M16 16l4 4" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
  Upload: ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
  Clock: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.75" />
      <path d="M12 7v5l3 2" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
  Calendar: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="5" width="17" height="15" rx="2" stroke={color} strokeWidth="1.75" />
      <path d="M3.5 10h17M8 3v4M16 3v4" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
  Dumbbell: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="9" width="3" height="6" rx="1" stroke={color} strokeWidth="1.75" />
      <rect x="19" y="9" width="3" height="6" rx="1" stroke={color} strokeWidth="1.75" />
      <rect x="5" y="10.5" width="2" height="3" stroke={color} strokeWidth="1.75" />
      <rect x="17" y="10.5" width="2" height="3" stroke={color} strokeWidth="1.75" />
      <path d="M7 12h10" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
  Fire: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3c1 3 4 4 4 8a4 4 0 11-8 0c0-2 1-3 2-4-1 4 2 4 2 4s0-3 0-5c0-1 0-2 0-3z" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  ),
  Trophy: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M7 4h10v4a5 5 0 01-10 0V4z" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M5 5h2v3a3 3 0 01-3-3h1zM19 5h-2v3a3 3 0 003-3h-1z" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M12 13v3M9 19h6M10 19v-2h4v2" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
  Trash: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 7h14M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ArrowUp: ({ size = 11, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M6 9V3M6 3l3 3M6 3l-3 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ArrowDown: ({ size = 11, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M6 3v6M6 9l3-3M6 9l-3-3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Equals: ({ size = 11, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M3 5h6M3 8h6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  File: ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M14 3v5h5" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  ),
  Check: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12l4 4 10-10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Pencil: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 20l1-4L16 5l3 3L8 19l-4 1z" stroke={color} strokeWidth="1.75" strokeLinejoin="round"/>
      <path d="M13.5 7.5l3 3" stroke={color} strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  ),
  Reset: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 4v6h6" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 10a8 8 0 11-1 6" stroke={color} strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  ),
  Folder: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 6.5a2 2 0 012-2h4l2 2h8a2 2 0 012 2V18a2 2 0 01-2 2H5a2 2 0 01-2-2V6.5z" stroke={color} strokeWidth="1.75" strokeLinejoin="round"/>
    </svg>
  ),
  FolderPlus: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 6.5a2 2 0 012-2h4l2 2h8a2 2 0 012 2V18a2 2 0 01-2 2H5a2 2 0 01-2-2V6.5z" stroke={color} strokeWidth="1.75" strokeLinejoin="round"/>
      <path d="M12 11v5M9.5 13.5h5" stroke={color} strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  ),
  Plus: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  Home: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 11l8-7 8 7v8a2 2 0 01-2 2h-3v-6h-6v6H6a2 2 0 01-2-2v-8z" stroke={color} strokeWidth="1.75" strokeLinejoin="round"/>
    </svg>
  ),
};

export default Icon;

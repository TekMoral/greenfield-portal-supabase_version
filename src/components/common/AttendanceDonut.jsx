import React from 'react';

// Lightweight SVG donut chart for attendance percentage (0 - 100)
// No external dependencies; minimal runtime cost.
const AttendanceDonut = ({ percent = 0, size = 120, strokeWidth = 12, className = '' }) => {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - p / 100);
  
  // Generate unique gradient ID to avoid conflicts when multiple donuts are rendered
  const gradientId = `attendanceGradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {/* Center text */}
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          className="fill-slate-800"
          fontSize={20}
          fontWeight={700}
        >
          {p}%
        </text>
      </svg>
    </div>
  );
};

export default AttendanceDonut;

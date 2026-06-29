import React from 'react';

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  showText?: boolean;
}

const CODE39_PATTERNS: { [key: string]: string } = {
  '0': 'nnnwwnywn',
  '1': 'wnnwnnnnw',
  '2': 'nnwwnnnnw',
  '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn',
  '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn',
  '9': 'nnwwnnwnn',
  'A': 'wnnnnwnnw',
  'B': 'nnwnnwnnw',
  'C': 'wnwnnwnnn',
  'D': 'nnnnwwnnw',
  'E': 'wnnnwwnnn',
  'F': 'nnwnwwnnn',
  'G': 'nnnnnwwnw',
  'H': 'wnnnnwwnn',
  'I': 'nnwnnwwnn',
  'J': 'nnnnwwwnn',
  'K': 'wnnnnnnww',
  'L': 'nnwnnnnww',
  'M': 'wnwnnnnwn',
  'N': 'nnnnwnnww',
  'O': 'wnnnwnnwn',
  'P': 'nnwnwnnwn',
  'Q': 'nnnnnnwww',
  'R': 'wnnnnnwwn',
  'S': 'nnwnnnwwn',
  'T': 'nnnnwnwwn',
  'U': 'wwnnnnnnw',
  'V': 'nwwnnnnnw',
  'W': 'wwwnnnnnn',
  'X': 'nwnnwnnnw',
  'Y': 'wwnnwnnnn',
  'Z': 'nwwnwnnnn',
  '-': 'nwnnnnwnw',
  '.': 'wwnnnnwnn',
  ' ': 'nwwnnnwnn',
  '*': 'nwnnwnwnn',
  '$': 'nwnwnwnnn',
  '/': 'nwnwnnnwn',
  '+': 'nwnnnwnwn',
  '%': 'nnnwnwnwn'
};

export default function Barcode({ value, width = 2, height = 50, showText = true }: BarcodeProps) {
  // Code 39 requires uppercase
  const cleanValue = `*${value.toUpperCase()}*`;
  
  let resultBars: { type: 'bar' | 'space'; width: number }[] = [];
  
  for (let i = 0; i < cleanValue.length; i++) {
    const char = cleanValue[i];
    const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS[' '];
    
    // Each pattern has 9 bars (5 black, 4 white)
    for (let j = 0; j < pattern.length; j++) {
      const isBar = j % 2 === 0; // Alternating bar and space
      const isWide = pattern[j] === 'w';
      const barWidth = isWide ? width * 2.5 : width;
      
      resultBars.push({
        type: isBar ? 'bar' : 'space',
        width: barWidth
      });
    }
    
    // Add an inter-character gap (narrow space) after each character except the last one
    if (i < cleanValue.length - 1) {
      resultBars.push({
        type: 'space',
        width: width
      });
    }
  }
  
  // Calculate total width of the SVG
  const totalWidth = resultBars.reduce((sum, bar) => sum + bar.width, 0);
  
  let currentX = 0;
  
  return (
    <div className="flex flex-col items-center">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${totalWidth} ${height}`}
        preserveAspectRatio="none"
        className="block"
      >
        {resultBars.map((bar, index) => {
          const barX = currentX;
          currentX += bar.width;
          
          if (bar.type === 'bar') {
            return (
              <rect
                key={index}
                x={barX}
                y={0}
                width={bar.width}
                height={height}
                fill="black"
              />
            );
          }
          return null;
        })}
      </svg>
      {showText && (
        <span className="text-[10px] font-mono tracking-widest text-slate-800 mt-1 block">
          {value.toUpperCase()}
        </span>
      )}
    </div>
  );
}

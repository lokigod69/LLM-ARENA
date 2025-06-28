// Matrix Rain Background Component
// Creates the iconic falling green characters effect from The Matrix
// Enhanced with side-column layout and authentic Matrix styling
'use client';

import { useEffect, useRef } from 'react';

const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Authentic Matrix characters (Japanese katakana and numbers)
    const matrixChars = 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍｸﾁｺｿﾉﾄﾆﾌﾒﾋﾅﾖｱｶﾁｼﾘﾏｴﾎﾞ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ:・."=*+-<>';
    
    const fontSize = 18;
    const sideWidth = 250; // Width of rain effect on each side
    
    // Create columns only for left and right sides
    const leftColumns = Math.floor(sideWidth / fontSize);
    const rightColumns = Math.floor(sideWidth / fontSize);
    const totalColumns = leftColumns + rightColumns;
    
    // Arrays to track positions and properties
    const drops: number[] = [];
    const speeds: number[] = [];
    const brightnesses: number[] = [];
    const columnPositions: number[] = [];
    
    // Initialize left side columns
    for (let i = 0; i < leftColumns; i++) {
      drops[i] = Math.random() * canvas.height;
      speeds[i] = Math.random() * 3 + 1; // Speed between 1-4
      brightnesses[i] = Math.random() * 0.5 + 0.3; // Brightness 0.3-0.8
      columnPositions[i] = i * fontSize;
    }
    
    // Initialize right side columns
    for (let i = leftColumns; i < totalColumns; i++) {
      drops[i] = Math.random() * canvas.height;
      speeds[i] = Math.random() * 3 + 1;
      brightnesses[i] = Math.random() * 0.5 + 0.3;
      columnPositions[i] = canvas.width - sideWidth + (i - leftColumns) * fontSize;
    }

    const draw = () => {
      // Create trailing effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Set text properties
      ctx.font = `${fontSize}px 'Courier Prime', 'Courier New', monospace`;
      ctx.textAlign = 'center';

      // Draw characters for each column
      for (let i = 0; i < totalColumns; i++) {
        const x = columnPositions[i];
        const y = drops[i];
        
        // Create gradient effect - brighter at the leading edge
        const gradient = ctx.createLinearGradient(x, y - fontSize * 8, x, y);
        gradient.addColorStop(0, 'rgba(0, 255, 65, 0)');
        gradient.addColorStop(0.7, `rgba(0, 255, 65, ${brightnesses[i] * 0.3})`);
        gradient.addColorStop(0.9, `rgba(0, 255, 65, ${brightnesses[i] * 0.8})`);
        gradient.addColorStop(1, `rgba(0, 255, 65, ${brightnesses[i]})`);
        
        ctx.fillStyle = gradient;
        
        // Draw multiple characters in a trail
        for (let j = 0; j < 12; j++) {
          const char = matrixChars[Math.floor(Math.random() * matrixChars.length)];
          const trailY = y - (j * fontSize);
          
          if (trailY > 0 && trailY < canvas.height) {
            const trailOpacity = Math.max(0, 1 - (j * 0.15));
            ctx.fillStyle = `rgba(0, 255, 65, ${brightnesses[i] * trailOpacity})`;
            ctx.fillText(char, x, trailY);
          }
        }

        // Leading bright character
        const leadChar = matrixChars[Math.floor(Math.random() * matrixChars.length)];
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, brightnesses[i] * 1.5)})`;
        ctx.fillText(leadChar, x, y);

        // Move the drop down
        drops[i] += speeds[i];

        // Reset drop when it goes off screen
        if (drops[i] > canvas.height + fontSize * 5) {
          drops[i] = -fontSize * Math.random() * 20;
          speeds[i] = Math.random() * 3 + 1;
          brightnesses[i] = Math.random() * 0.5 + 0.3;
        }
      }
    };

    // Animation loop - smoother animation
    const interval = setInterval(draw, 60);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="matrix-rain-bg"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: -10, // Further behind everything
        opacity: 0.6, // More visible but not overwhelming
      }}
    />
  );
};

export default MatrixRain; 
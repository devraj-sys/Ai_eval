import React, { useState, useEffect } from 'react';

const MESSAGES = [
  "Go drink some water while you wait 💧",
  "Drop and give me 10 push-ups while this loads 💪",
];

interface GeminiLoaderProps {
  message?: string;
}

const GeminiLoader: React.FC<GeminiLoaderProps> = ({ message }) => {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(i => (i + 1) % MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="gemini-loader-overlay">
      <div className="gemini-loader-box">
        <div className="gemini-spinner" />
        <div className="gemini-loader-title">
          {message || 'AI is working...'}
        </div>
        <div className="gemini-loader-msg">
          "{MESSAGES[msgIndex]}"
        </div>
      </div>
    </div>
  );
};

export default GeminiLoader;

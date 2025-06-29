'use client';

import React, { useEffect, useRef } from 'react';

interface MessageProps {
  role: 'user' | 'model';
  content: string;
  isLoading?: boolean;
}

const Message: React.FC<MessageProps> = ({ role, content, isLoading = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const codeBlocks = container.querySelectorAll('pre.code-block');

    codeBlocks.forEach((block) => {
      if (block.parentElement?.classList.contains('code-wrapper')) return;

      const code = block.querySelector('code');
      if (!code) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'relative bg-black text-white rounded-lg p-4 overflow-x-auto my-4 code-wrapper';

      const copyBtn = document.createElement('button');
      copyBtn.textContent = 'Copy';
      copyBtn.className =
        'absolute top-2 right-2 text-sm bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(code.innerText).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
        });
      };

      wrapper.appendChild(copyBtn);
      wrapper.appendChild(block.cloneNode(true));
      block.replaceWith(wrapper);
    });
  }, [content]);

  if (isLoading) {
    return (
      <div className="flex justify-start">
        <div className="max-w-3xl rounded-lg px-4 py-2 bg-gray-100 text-gray-800">
          <div className="flex space-x-2 py-2">
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 rounded-full bg-gray-600 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-3xl rounded-lg px-4 py-2 ${
          role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'
        }`}
      >
        <div
          ref={containerRef}
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </div>
  );
};

export default Message;

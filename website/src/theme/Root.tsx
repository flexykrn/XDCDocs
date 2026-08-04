import React from 'react';
import ChatWidget from '@site/src/components/ChatWidget';

export default function Root({children}: {children: React.ReactNode}) {
  return (
    <>
      {children}
      <ChatWidget />
    </>
  );
}

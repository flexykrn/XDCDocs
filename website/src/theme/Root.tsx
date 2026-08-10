import React, {useEffect} from 'react';
import {useLocation} from '@docusaurus/router';
import ChatWidget from '@site/src/components/ChatWidget';

function useScrollActiveMenuItem() {
  const {pathname} = useLocation();
  useEffect(() => {
    const timer = setTimeout(() => {
      const actives = Array.from(
        document.querySelectorAll('.menu__link--active')
      ) as HTMLElement[];
      const target = actives[actives.length - 1];
      if (!target) return;
      let container = target.parentElement;
      while (container) {
        const style = getComputedStyle(container);
        if (
          (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
          container.scrollHeight > container.clientHeight
        ) {
          break;
        }
        container = container.parentElement;
      }
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const tRect = target.getBoundingClientRect();
      if (tRect.top >= cRect.top && tRect.bottom <= cRect.bottom) return;
      container.scrollTop += tRect.top - cRect.top - cRect.height / 3;
    }, 150);
    return () => clearTimeout(timer);
  }, [pathname]);
}

export default function Root({children}: {children: React.ReactNode}) {
  useScrollActiveMenuItem();
  return (
    <>
      {children}
      <ChatWidget />
    </>
  );
}

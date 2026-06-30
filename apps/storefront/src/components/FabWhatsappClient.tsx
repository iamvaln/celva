'use client';

import { useEffect, useState } from 'react';

/**
 * Floating WhatsApp affordance. Hides on scroll down, shows on scroll
 * up or when near the top. The href + label come from the server
 * wrapper so the phone is admin-editable via Settings.
 */
export const FabWhatsappClient = ({
  href,
  ariaLabel,
}: {
  href: string;
  ariaLabel: string;
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setVisible(y < lastY || y < 80);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={`fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full shadow-fab transition-all duration-color ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
      style={{ background: '#25D366', color: '#fff' }}
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor" aria-hidden>
        <path d="M16 3C9.4 3 4 8.4 4 15c0 2.3.7 4.4 1.8 6.2L4 29l8-2.1c1.7.9 3.7 1.4 5.7 1.4 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.9c-1.8 0-3.5-.5-5-1.4l-.4-.2-4.7 1.2 1.3-4.6-.3-.5A9.9 9.9 0 0 1 6.1 15c0-5.5 4.5-10 9.9-10s9.9 4.5 9.9 10-4.4 9.9-9.9 9.9zm5.4-7.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-1 1.2-.4.2-.7.1c-1.2-.6-2.1-1.1-3-2.5-.2-.4.2-.4.6-1.2.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.4 1 2.8 1.2 3 2 3.1 4.9 4.3c.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.4z" />
      </svg>
    </a>
  );
};

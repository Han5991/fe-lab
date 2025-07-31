import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: ReactNode;
  container?: Element;
}

export const Portal = ({ children, container }: PortalProps) => {
  const [mounted, setMounted] = useState(false);
  const [portalContainer, setPortalContainer] = useState<Element | null>(null);

  useEffect(() => {
    setMounted(true);
    const element = container || document.body;
    setPortalContainer(element);

    return () => setMounted(false);
  }, [container]);

  if (!mounted || !portalContainer) {
    return null;
  }

  return createPortal(children, portalContainer);
};

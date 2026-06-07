import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

/**
 * A dropdown rendered into document.body so it can't be clipped by an ancestor's
 * `overflow: hidden` (the venture-block clipping bug). Positioned under its
 * anchor; closes on outside click, scroll, resize, or Escape.
 */
export function PortalMenu({
  anchorRef,
  open,
  onClose,
  align = 'right',
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  align?: 'left' | 'right';
  children: ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [top, setTop] = useState(0);

  useLayoutEffect(() => {
    if (open && anchorRef.current) setRect(anchorRef.current.getBoundingClientRect());
  }, [open, anchorRef]);

  // Once rendered, measure and flip up / clamp so the menu stays on screen.
  useLayoutEffect(() => {
    if (!rect || !menuRef.current) return;
    const h = menuRef.current.offsetHeight;
    const below = rect.bottom + 4;
    const next =
      below + h + 8 <= window.innerHeight
        ? below
        : rect.top - h - 4 >= 8
          ? rect.top - h - 4
          : Math.max(8, window.innerHeight - h - 8);
    setTop(next);
  }, [rect]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onScroll = () => onClose();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !rect) return null;

  const style: React.CSSProperties =
    align === 'right'
      ? { top, right: Math.max(8, window.innerWidth - rect.right) }
      : { top, left: rect.left };

  return createPortal(
    <div ref={menuRef} className="portal-menu" style={style} role="menu">
      {children}
    </div>,
    document.body,
  );
}

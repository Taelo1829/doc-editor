import { useEffect, useState, type RefObject } from "react";

/**
 * Becomes true once the element scrolls within `margin` of the viewport, and stays
 * true. Pages far down a long document are not rendered until they are needed.
 */
export function useNearViewport(ref: RefObject<Element | null>, margin = "800px"): boolean {
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || isNear) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsNear(true);
        }
      },
      { rootMargin: margin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, margin, isNear]);

  return isNear;
}

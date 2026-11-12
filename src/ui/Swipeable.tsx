import React from 'react';
import { useSwipeDismiss } from './useSwipeDismiss';

type SwipeableProps = React.HTMLAttributes<HTMLDivElement> & { onDismiss: () => void };

/** A toast / card that can be swiped sideways to dismiss it (Android-style). */
export const Swipeable: React.FC<SwipeableProps> = ({ onDismiss, style, children, ...rest }) => {
  const swipe = useSwipeDismiss(onDismiss);
  return (
    <div {...rest} {...swipe.handlers} style={{ ...style, ...swipe.style }}>
      {children}
    </div>
  );
};

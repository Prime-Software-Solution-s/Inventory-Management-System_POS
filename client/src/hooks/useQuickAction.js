import { useEffect, useEffectEvent } from 'react';

const useQuickAction = (actionName, handler) => {
  const handleAction = useEffectEvent((event) => {
    if (event.detail === actionName) {
      handler();
    }
  });

  useEffect(() => {
    const listener = (event) => handleAction(event);

    window.addEventListener('inventory:quick-action', listener);
    return () => {
      window.removeEventListener('inventory:quick-action', listener);
    };
  }, [handleAction]);
};

export { useQuickAction };

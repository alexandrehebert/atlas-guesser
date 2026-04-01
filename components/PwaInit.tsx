'use client';

import { useEffect } from 'react';

export function PwaInit() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(
            registrations
              .filter((registration) => registration.scope.startsWith(window.location.origin))
              .map((registration) => registration.unregister())
          )
        );

      return;
    }

    void navigator.serviceWorker.register('/sw.js');
  }, []);

  return null;
}
'use client';
import { useEffect, useRef } from 'react';
import { wsManager } from '@/lib/ws';

export function useWebSocket() {
  useEffect(() => {
    wsManager.connect();
  }, []);

  function subscribe(channel: string, callback: (data: unknown) => void) {
    wsManager.subscribe(channel, callback);
    return () => wsManager.unsubscribe(channel, callback);
  }

  return { subscribe };
}

export function useChannel(channel: string, callback: (data: unknown) => void) {
  // Stable ref to callback so we can update without resubscribing
  const callbackRef = useRef(callback);
  // Update ref inside effect to avoid render-time mutation
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!channel) return; // skip empty channel (e.g. user not logged in)
    const handler = (data: unknown) => callbackRef.current(data);
    wsManager.subscribe(channel, handler);
    return () => wsManager.unsubscribe(channel, handler);
  }, [channel]);
}

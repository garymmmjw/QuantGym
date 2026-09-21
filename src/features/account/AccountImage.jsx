import { useEffect, useState } from 'react';
import { useAppStore, useAuthStore } from '../../stores/AppServicesContext.jsx';
import { fetchPrivateImage, privateMediaRequest } from './privateMedia.js';

export function AccountImage({ src, alt = '', className, loading, fallback = 'Q' }) {
  const ownerId = useAuthStore(state => state.currentUser?.id || '');
  const config = useAppStore(state => state.cloudConfig || {});
  const [resolved, setResolved] = useState(null);
  const key = JSON.stringify([src, ownerId, config.endpoint, config.userId, config.token]);
  const privateRequest = privateMediaRequest(src, config, ownerId);
  useEffect(() => {
    if (!privateRequest || privateRequest.blocked) return;
    const controller = new AbortController();
    let objectUrl = '';
    fetchPrivateImage(src, config, ownerId, { signal: controller.signal }).then(result => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(result.blob);
      setResolved({ key, source: objectUrl });
    }).catch(() => { if (!controller.signal.aborted) setResolved({ key, source: '' }); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [key]);
  const source = privateRequest ? resolved?.key === key ? resolved.source : '' : src;
  return source ? <img src={source} alt={alt} className={className} loading={loading} /> : <span aria-label={alt}>{fallback}</span>;
}

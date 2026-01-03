// hooks/useGlobalNotifications.js
import { useEffect } from 'react';
import { useMqtt } from '@/context/MqttContext';

export default function useGlobalNotifications() {
  const { registerNotificationCallback, isConnected } = useMqtt();

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = registerNotificationCallback((notification) => {
      
      
    });

    return unsubscribe;
  }, [isConnected, registerNotificationCallback]);

  return { isConnected };
}
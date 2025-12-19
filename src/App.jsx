import './App.css';
import { Toaster, toast } from "sonner"; 
import AppRoutes from "./routes/AppRoutes";
import { AuthProvider } from "./context/AuthContext";
import { MqttProvider } from "./context/MqttContext";
import { HashRouter } from "react-router-dom";
import { useAuth } from "./context/AuthContext"; 
import { useMqtt } from "./context/MqttContext"; 
import { useEffect, useRef, useState } from "react";

const isLoginPage = () => {
  const hash = window.location.hash;
  return hash === '#/' || hash === '#/login' || hash === '';
};

const createToastInterceptor = () => {
  const originalToast = { ...toast };
  
  const toastFunctions = ['success', 'error', 'info', 'warning', 'message', 'custom', 'promise', 'loading', 'dismiss'];
  
  toastFunctions.forEach(funcName => {
    const originalFunc = toast[funcName];
    if (typeof originalFunc === 'function') {
      toast[funcName] = function(...args) {
        if (isLoginPage()) {
          console.log(` Toast ${funcName} blocked on login page`);
          if (funcName === 'promise') {
            return Promise.resolve();
          }
          return null;
        }
        return originalFunc.apply(this, args);
      };
    }
  });
  
  return originalToast;
};

function ToastBlocker() {
  const [isLogin, setIsLogin] = useState(isLoginPage());
  const originalToastRef = useRef(null);

  useEffect(() => {
    if (!originalToastRef.current) {
      originalToastRef.current = { ...toast };
    }
    
    createToastInterceptor();
    
    const checkPath = () => {
      const loginStatus = isLoginPage();
      if (loginStatus !== isLogin) {
        setIsLogin(loginStatus);
        createToastInterceptor();
      }
    };
    
    const handleHashChange = () => {
      setTimeout(checkPath, 10);
    };
    
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      setTimeout(checkPath, 10);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      setTimeout(checkPath, 10);
    };
    
    window.addEventListener('hashchange', handleHashChange);
    
    // تنظيف
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      
      if (originalToastRef.current) {
        Object.keys(originalToastRef.current).forEach(key => {
          if (typeof originalToastRef.current[key] === 'function') {
            toast[key] = originalToastRef.current[key];
          }
        });
      }
    };
  }, [isLogin]);
  
  return null;
}

function MqttStatusIndicator() {
  const { connectionCount, connectedCount, activeConnections, reconnectAll } = useMqtt();
  const { userRole, isAuthenticated } = useAuth(); 
  
  if (!isAuthenticated || userRole !== 'admin') {
    return null;
  }
  
  if (connectionCount === 0) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: '#EF4444',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '12px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        cursor: 'pointer'
      }}
      onClick={reconnectAll}
      title="Click to reconnect">
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#DC2626'
        }} />
        <span>No MQTT connections</span>
      </div>
    );
  }
  
  const connectionStatus = connectedCount === connectionCount ? 
    "All connections active" : 
    `${connectedCount}/${connectionCount} connections active`;
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: connectedCount === connectionCount ? '#10B981' : '#F59E0B',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '20px',
      fontSize: '12px',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      cursor: 'pointer'
    }}
    onClick={reconnectAll}
    title="Click to reconnect all connections">
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: connectedCount === connectionCount ? '#34D399' : '#FBBF24',
        animation: connectedCount === connectionCount ? 'pulse 2s infinite' : 'none'
      }} />
      <span>MQTT: {connectionStatus}</span>
    </div>
  );
}

// مكون Toaster مخصص يعطل نفسه في صفحة Login
function ConditionalToaster() {
  const [showToaster, setShowToaster] = useState(!isLoginPage());
  
  useEffect(() => {
    const checkAndUpdate = () => {
      const shouldShow = !isLoginPage();
      if (shouldShow !== showToaster) {
        setShowToaster(shouldShow);
      }
    };
    
    const handleHashChange = () => {
      setTimeout(checkAndUpdate, 10);
    };
    
    window.addEventListener('hashchange', handleHashChange);
    
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      setTimeout(checkAndUpdate, 10);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      setTimeout(checkAndUpdate, 10);
    };
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [showToaster]);
  
  if (!showToaster) {
    return null;
  }
  
  return <Toaster position="top-center" richColors />;
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <MqttProvider>
          <ToastBlocker /> 
          <AppRoutes />
          <ConditionalToaster /> 
          <MqttStatusIndicator />
        </MqttProvider>
      </HashRouter>
    </AuthProvider>
  );
}
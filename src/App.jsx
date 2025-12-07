import './App.css';
import { Toaster } from "sonner";
import AppRoutes from "./routes/AppRoutes";
import { AuthProvider } from "./context/AuthContext";
import { MqttProvider } from "./context/MqttContext";
import { HashRouter } from "react-router-dom";
import { useAuth } from "./context/AuthContext"; 
import { useMqtt } from "./context/MqttContext"; 

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

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <MqttProvider>
          <AppRoutes />
          <Toaster position="top-center" richColors />
          <MqttStatusIndicator />
        </MqttProvider>
      </HashRouter>
    </AuthProvider>
  );
}
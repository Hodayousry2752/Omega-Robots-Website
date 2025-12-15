import { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null); 
  const [projectName, setProjectName] = useState(null);
  const [userName, setUserName] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = Cookies.get("accessToken");
      const role = Cookies.get("userRole");
      const project = Cookies.get("projectName");
      const name = Cookies.get("userName");
      
      if (token && role) {
        setIsAuthenticated(true);
        setUserRole(role);
        setProjectName(project || null);
        setUserName(name || null);
      } else if (role && !token) {
        clearAllCookies();
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(false);
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const clearAllCookies = () => {
    Cookies.remove("accessToken");
    Cookies.remove("refreshToken");
    Cookies.remove("userRole");
    Cookies.remove("projectName");
    Cookies.remove("userName");
  };

  const login = (role = 'user', projectNameValue = '', userNameValue = '') => {
    setIsAuthenticated(true);
    setUserRole(role);
    setProjectName(projectNameValue);
    setUserName(userNameValue);

    const cookieOptions = { expires: 365, path: '/' };
    
    Cookies.set("userRole", role, cookieOptions);
    Cookies.set("projectName", projectNameValue, cookieOptions);
    Cookies.set("userName", userNameValue, cookieOptions);
    Cookies.set("accessToken", "dummy_token_" + Date.now(), cookieOptions);
    
    // حفظ في localStorage
    try {
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("userRole", role);
      localStorage.setItem("userName", userNameValue);
      localStorage.setItem("projectName", projectNameValue);
      localStorage.setItem("loginTime", Date.now().toString());
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setProjectName(null);
    setUserName(null);
    
    clearAllCookies();
    
    // مسح localStorage (لكن نحتفظ ببيانات Remember Me والاقتراحات)
    try {
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userName");
      localStorage.removeItem("projectName");
      localStorage.removeItem("loginTime");
      
      // ملاحظة: نحتفظ بـ omega_remember_me و omega_saved_usernames
      console.log("✅ Logout complete. Remember me data and suggestions preserved.");
    } catch (error) {
      console.error("Error clearing localStorage:", error);
    }
  };

  // دالة لحذف جميع البيانات المحفوظة (للإعدادات المتقدمة)
  const clearAllSavedData = () => {
    try {
      localStorage.removeItem("omega_remember_me");
      localStorage.removeItem("omega_saved_usernames");
      console.log("✅ All saved login data cleared");
    } catch (error) {
      console.error("Error clearing saved data:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      userRole, 
      projectName,
      userName,
      isLoading,
      login, 
      logout,
      clearAllSavedData
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
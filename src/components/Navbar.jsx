import { LogOut, Menu, X, UserCheck, Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LogoImg from "../assets/logo omega-2022.png";
import NotificationsDropdown from "../components/DropdownNotes";
import axios from "axios";

export default function Navbar() {
  const { logout, projectName, userName } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopNotifications, setDesktopNotifications] = useState(false);
  const [mobileNotifications, setMobileNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastOpenedTime, setLastOpenedTime] = useState(null);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [bellColor, setBellColor] = useState("currentColor");
  const [isBlinking, setIsBlinking] = useState(false);
  
  const desktopDropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);
  const desktopBellRef = useRef(null);
  const mobileBellRef = useRef(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const isNewNotification = (note) => {
    try {
      const noteDate = new Date(`${note.date}T${note.time}`);
      
      if (!lastOpenedTime) return true;
      
      const lastOpened = new Date(lastOpenedTime);
      return noteDate > lastOpened;
    } catch {
      return false;
    }
  };

  const isAlertNotification = (note) => {
    return note.type === 'alert';
  };

  const startBlinking = () => {
    if (isBlinking) return;
    
    setIsBlinking(true);
    let isRed = true;
    
    const blinkInterval = setInterval(() => {
      if (!isBlinking) {
        clearInterval(blinkInterval);
        return;
      }
      
      // Only blink if there are new notifications
      if (hasNewNotifications) {
        setBellColor(isRed ? "#ef4444" : "#3b82f6");
        isRed = !isRed;
      } else {
        setBellColor("currentColor");
        clearInterval(blinkInterval);
        setIsBlinking(false);
      }
    }, 1000);
    
    return () => clearInterval(blinkInterval);
  };

  const stopBlinking = () => {
    setIsBlinking(false);
    setBellColor("currentColor");
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/notifications.php`, {
        headers: { "Content-Type": "application/json" },
      });
      
      const allNotifications = Array.isArray(res.data) ? res.data : [];
      
      const projectNotifications = allNotifications.filter(note => {
        return true;
      });
      
      setNotifications(projectNotifications);
      
      const hasNew = projectNotifications.some(note => isNewNotification(note));
      setHasNewNotifications(hasNew);
      
      
      
      if (hasNew && !lastOpenedTime) {
        startBlinking();
      }
      
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedLastOpenedTime = localStorage.getItem('notificationsLastOpened');
    if (savedLastOpenedTime) {
      setLastOpenedTime(savedLastOpenedTime);
    }
  }, []);

  useEffect(() => {
    if (hasNewNotifications && !lastOpenedTime) {
      startBlinking();
    } else {
      stopBlinking();
    }
  }, [hasNewNotifications, lastOpenedTime]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [projectName]);

  const getFirstName = (fullName) => {
    if (!fullName) return "User";
    return fullName.split(" ")[0] || "User";
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const handleDesktopBellClick = () => {
    const now = new Date().toISOString();
    setLastOpenedTime(now);
    localStorage.setItem('notificationsLastOpened', now);
    setHasNewNotifications(false);
    stopBlinking();
    
    setDesktopNotifications(prev => !prev);
    setMobileNotifications(false);
    setMenuOpen(false);
  };

  const handleMobileBellClick = () => {
    const now = new Date().toISOString();
    setLastOpenedTime(now);
    localStorage.setItem('notificationsLastOpened', now);
    setHasNewNotifications(false);
    stopBlinking();
    
    setMobileNotifications(prev => !prev);
    setDesktopNotifications(false);
    setMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (desktopDropdownRef.current && 
          !desktopDropdownRef.current.contains(event.target) && 
          desktopBellRef.current && 
          !desktopBellRef.current.contains(event.target)) {
        setDesktopNotifications(false);
      }
      if (mobileDropdownRef.current && 
          !mobileDropdownRef.current.contains(event.target) && 
          mobileBellRef.current && 
          !mobileBellRef.current.contains(event.target)) {
        setMobileNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-5 md:px-10 py-3 relative">
        <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => navigate("/robots")}>
          <motion.img src={LogoImg} alt="Logo" className="h-9 w-auto object-contain" whileHover={{ scale: 1.05 }} />
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 cursor-pointer" onClick={() => navigate("/robots")}>
          <h1 className="text-lg md:text-xl font-semibold tracking-tight whitespace-nowrap">
            <span className="text-main-color">{projectName || "My Project"}</span>
          </h1>
        </div>

        <div className="hidden md:flex items-center gap-3 relative">
          <div className="flex items-center gap-2 px-4 py-2">
            <UserCheck className="w-5 h-5 text-second-color" />
            <span className="text-main-color text-lg md:text-xl font-semibold tracking-tight">{getFirstName(userName)}</span>
          </div>

          <div className="relative">
            <button
              ref={desktopBellRef}
              onClick={handleDesktopBellClick}
              className={`relative p-2 rounded-full transition ${
                desktopNotifications ? 'bg-main-color/20 text-main-color' : 'text-main-color hover:bg-main-color/10'
              }`}
            >
              <Bell className="w-5 h-5" style={{ color: bellColor }} />
              {hasNewNotifications && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
              )}
            </button>

            <AnimatePresence>
              {desktopNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full right-0 mt-2 z-[100]"
                >
                  <div ref={desktopDropdownRef}>
                    <NotificationsDropdown 
                      onClose={() => setDesktopNotifications(false)} 
                      position="header"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button
            onClick={handleLogout}
            className="flex items-center gap-1 border border-main-color text-main-color hover:bg-main-color hover:text-white transition-all duration-300 rounded-full px-5 py-2 text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <div className="relative">
            <button
              ref={mobileBellRef}
              onClick={handleMobileBellClick}
              className={`relative p-2 rounded-full transition ${
                mobileNotifications ? 'bg-main-color/20 text-main-color' : 'text-main-color hover:bg-main-color/10'
              }`}
            >
              <Bell className="w-5 h-5" style={{ color: bellColor }} />
              {hasNewNotifications && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
              )}
            </button>

            <AnimatePresence>
              {mobileNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full right-0 mt-2 z-[100]"
                >
                  <div ref={mobileDropdownRef}>
                    <NotificationsDropdown 
                      onClose={() => setMobileNotifications(false)} 
                      position="header"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className={`p-2 rounded-lg transition ${
              menuOpen ? 'bg-main-color/20 text-main-color' : 'text-main-color hover:bg-main-color/10'
            }`}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white border-t border-gray-100 shadow-md"
          >
            <div className="flex flex-col items-center py-4 space-y-3">
              <div className="flex items-center gap-2 w-[90%] px-4 py-2 justify-center">
                <UserCheck className="w-5 h-5 text-second-color" />
                <span className="text-main-color text-lg md:text-xl font-semibold tracking-tight">{getFirstName(userName)}</span>
              </div>
              <div className="w-[90%] text-center py-2">
                <span className="text-second-color font-medium">Project: {projectName || "My Project"}</span>
              </div>
              <Button 
                onClick={handleLogout} 
                className="w-[90%] flex items-center gap-1 border border-main-color text-main-color hover:bg-main-color hover:text-white transition-all duration-300 rounded-full py-2 text-sm font-medium"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </Button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
import { useState, useRef, useEffect } from "react";
import {
  FolderKanban,
  PlusCircle,
  Users,
  UserPlus,
  LogOut,
  ShieldCheck,
  LayoutDashboard,
  Bell
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Logo from "../../assets/logo omega-2022.png";
import NotificationCenter from "@/components/NotificationDashboard"; 
import axios from "axios";

export default function DashboardSidebar({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [showSidebarNotifications, setShowSidebarNotifications] = useState(false);
  const [showHeaderNotifications, setShowHeaderNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastOpenedTime, setLastOpenedTime] = useState(null);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [bellColor, setBellColor] = useState("currentColor");
  const [isBlinking, setIsBlinking] = useState(false);
  
  const sidebarDropdownRef = useRef(null);
  const sidebarBellRef = useRef(null);
  const headerDropdownRef = useRef(null);
  const headerBellRef = useRef(null);

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

  const fetchAllNotifications = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/notifications.php`, {
        headers: { "Content-Type": "application/json" },
      });
      
      const allNotifications = Array.isArray(res.data) ? res.data : [];
      setNotifications(allNotifications);
      
      const hasNew = allNotifications.some(note => isNewNotification(note));
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
    const savedLastOpenedTime = localStorage.getItem('dashboardNotificationsLastOpened');
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
    fetchAllNotifications();
    const interval = setInterval(fetchAllNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { name: "All Projects", icon: FolderKanban, path: "/homeDashboard" },
    { name: "Add Project", icon: PlusCircle, path: "/homeDashboard/projectForm" },
    { name: "All Users", icon: Users, path: "/homeDashboard/allUsers" },
    { name: "Add User", icon: UserPlus, path: "/homeDashboard/addUser" },
  ];

  const handleNavigation = (path) => navigate(path);
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleSidebarBellClick = () => {
    const now = new Date().toISOString();
    setLastOpenedTime(now);
    localStorage.setItem('dashboardNotificationsLastOpened', now);
    setHasNewNotifications(false);
    stopBlinking();
    
    setShowSidebarNotifications(prev => !prev);
    setShowHeaderNotifications(false);
  };

  const handleHeaderBellClick = () => {
    const now = new Date().toISOString();
    setLastOpenedTime(now);
    localStorage.setItem('dashboardNotificationsLastOpened', now);
    setHasNewNotifications(false);
    stopBlinking();
    
    setShowHeaderNotifications(prev => !prev);
    setShowSidebarNotifications(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showSidebarNotifications && 
          sidebarDropdownRef.current && 
          !sidebarDropdownRef.current.contains(e.target) &&
          sidebarBellRef.current && 
          !sidebarBellRef.current.contains(e.target)) {
        setShowSidebarNotifications(false);
      }
      
      if (showHeaderNotifications && 
          headerDropdownRef.current && 
          !headerDropdownRef.current.contains(e.target) &&
          headerBellRef.current && 
          !headerBellRef.current.contains(e.target)) {
        setShowHeaderNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSidebarNotifications, showHeaderNotifications]);

  return (
    <div className="flex bg-gray-50 min-h-screen max-lg:w-0 relative">
      <div
        className={`hidden lg:flex fixed top-0 left-0 h-screen bg-linear-to-b from-main-color to-second-color text-white 
        shadow-2xl border-r border-main-color/20 z-40 transition-all duration-300 ease-in-out 
        ${isOpen ? "w-72" : "w-16"} flex-col justify-between`}
      >
        <div>
          <div className="text-right">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`p-2 mr-auto rounded-full transition shadow-md cursor-pointer 
                ${isOpen ? "hover:bg-white/20 text-white" : "bg-white text-main-color hover:bg-white/90"}`}
              title={isOpen ? "Close Menu" : "Open Menu"}
            >
              {isOpen ? "×" : "›"}
            </button>
          </div>
          
          <div className={`flex items-center justify-between px-3 py-5 gap-2 border-b border-white/10 relative 
            ${isOpen ? "flex-row" : "flex-col"}`}>
            {isOpen ? (
              <div className="flex items-center gap-3 pl-2 select-none ">
                <img
                  src={Logo}
                  alt="Admin Logo"
                  className="h-10 w-10 object-contain rounded-full bg-white p-1 "
                />
                <div className="flex items-center gap-1 text-sm text-white/80">
                  <ShieldCheck size={18} className="text-green-400" />
                  <span className="font-medium">Admin</span>
                </div>
              </div>
            ) : (
              <img
                src={Logo}
                alt="Logo"
                className="h-10 w-10 object-contain mx-auto rounded-full bg-white p-1 select-none"
              />
            )}
            
            <div className="relative " ref={sidebarBellRef}>
              <button
                onClick={handleSidebarBellClick}
                className={`p-2 rounded-full transition relative ${
                  showSidebarNotifications ? "bg-white/30 " : "hover:bg-white/20"
                }`}
              >
                <Bell size={20} style={{ color: bellColor }} />
                {hasNewNotifications && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                )}
              </button>
              
              {showSidebarNotifications && (
                <div 
                  ref={sidebarDropdownRef}
                  className="absolute top-full left-0 mt-2 z-50"
                >
                  <NotificationCenter 
                    onClose={() => setShowSidebarNotifications(false)} 
                    mode="dropdown"
                    position="sidebar"
                  />
                </div>
              )}
            </div>
          </div>

          <nav className={`flex flex-col gap-2 p-4 ${isOpen ? "overflow-y-auto" : "overflow-hidden"}`}>
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <div key={index} className="relative group">
                  <button
                    onClick={() => handleNavigation(item.path)}
                    className={`flex items-center gap-3 py-2 px-2 rounded-lg font-medium w-full cursor-pointer
                    transition duration-300 ${
                      active ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/15 hover:text-white"
                    } ${!isOpen ? "justify-center" : ""}`}
                  >
                    <Icon size={22} />
                    {isOpen && <span>{item.name}</span>}
                  </button>

                  {!isOpen && (
                    <span className="absolute left-1/2 -translate-x-1/2 bottom-[110%] bg-black/80 text-white text-xs px-2 rounded opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap shadow-md">
                      {item.name}
                    </span>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/10 p-4 flex flex-col">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 text-white/90 font-medium py-2 px-1 rounded-lg hover:bg-white/15 transition w-full cursor-pointer ${
              !isOpen ? "justify-center" : "justify-start"
            }`}
          >
            <LogOut size={20} />
            {isOpen && <span>Logout</span>}
          </button>

          {isOpen && (
            <div className="mt-3 text-xs text-white/60 flex">
              <LayoutDashboard size={14} className="mb-1 me-2" />
              <span> © 2025 Dashboard</span>
            </div>
          )}
        </div>
      </div>

      <header className="lg:hidden fixed top-0 left-0 right-0 bg-linear-to-r from-main-color to-second-color text-white flex items-center justify-between px-4 py-3 z-40">
        <div className="flex items-center gap-2 select-none">
          <img
            src={Logo}
            alt="Logo"
            className="h-9 w-9 object-contain rounded-full bg-white p-1"
          />
          <div className="flex items-center gap-1 text-sm text-white/80">
            <ShieldCheck size={16} className="text-green-400" />
            <span className="font-medium text-xs sm:text-sm">Admin</span>
          </div>
        </div>

        <nav className="flex items-center gap-4 sm:gap-5 ">
          <div className="relative" ref={headerBellRef}>
            <button
              onClick={handleHeaderBellClick}
              className={`p-2 rounded-full transition relative ${
                showHeaderNotifications ? "bg-white/30 " : "hover:bg-white/20"
              }`}
            >
              <Bell size={22} style={{ color: bellColor }} />
              {hasNewNotifications && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              )}
            </button>
            
            {showHeaderNotifications && (
              <div ref={headerDropdownRef} className="absolute top-full right-0 mt-2 z-50">
                <NotificationCenter 
                  onClose={() => setShowHeaderNotifications(false)} 
                  mode="dropdown"
                  position="header"
                />
              </div>
            )}
          </div>

          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <button
                key={index}
                onClick={() => handleNavigation(item.path)}
                title={item.name}
                className={`relative group transition cursor-pointer ${
                  active ? "text-white drop-shadow-md" : "text-white/70 hover:text-white"
                }`}
              >
                <Icon size={22} />
                <span className="absolute bottom-[120%] left-1/2 -translate-x-1/2 text-xs bg-black/70 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition">
                  {item.name}
                </span>
              </button>
            );
          })}

          <button
            onClick={handleLogout}
            title="Logout"
            className="text-white/70 hover:text-white transition cursor-pointer"
          >
            <LogOut size={22} />
          </button>
        </nav>
      </header>

      <main
        className={`flex-1 transition-all duration-300 ease-in-out overflow-y-auto pt-[70px] lg:pt-0 ${
          isOpen ? "lg:pl-[18rem]" : "lg:pl-[4rem]"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
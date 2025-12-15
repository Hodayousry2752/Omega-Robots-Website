import { useState, useEffect, useRef } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "../components/ui/card";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { User, Lock, Eye, EyeOff, Save, ChevronDown, X } from "lucide-react";
import LogoImg from "../assets/logo omega-2022.png";
import { postData } from "@/services/postServices";

export default function Login() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [savedUsernames, setSavedUsernames] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  
  const usernameRef = useRef(null);
  const suggestionsRef = useRef(null);

  const BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // تحميل أسماء المستخدمين المحفوظة عند تحميل الصفحة
  useEffect(() => {
    if (!isLoading) {
      // تحميل قائمة أسماء المستخدمين المحفوظة
      try {
        const savedUsers = localStorage.getItem("omega_saved_usernames");
        if (savedUsers) {
          const usernames = JSON.parse(savedUsers);
          setSavedUsernames(usernames || []);
          console.log("✅ Loaded saved usernames:", usernames?.length || 0);
        }
      } catch (error) {
        console.error("Error loading saved usernames:", error);
      }

      // تحميل بيانات Remember Me فقط إذا تم تفعيلها سابقاً
      try {
        const savedCredentials = localStorage.getItem("omega_remember_me");
        if (savedCredentials) {
          const credentials = JSON.parse(savedCredentials);
          if (credentials && credentials.username) {
            console.log("✅ Remember Me data is available (not auto-filled)");
          }
        }
      } catch (error) {
        console.error("Error loading saved credentials:", error);
      }

      // التحقق مما إذا كان المستخدم مسجل دخول بالفعل
      const savedAuth = localStorage.getItem("isAuthenticated");
      const savedRole = localStorage.getItem("userRole");
      const savedName = localStorage.getItem("userName");
      
      if (savedAuth === "true" && savedRole) {
        login(savedRole, "", savedName || "");
        
        setTimeout(() => {
          const redirectPath = savedRole === 'admin' ? "/homeDashboard" : "/robots";
          navigate(redirectPath, { replace: true });
        }, 100);
      }
    }
  }, [isLoading, login, navigate]);

  // إغلاق الاقتراحات عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          usernameRef.current && !usernameRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // فلترة الاقتراحات بناءً على ما يكتبه المستخدم
  useEffect(() => {
    if (username.trim() === "") {
      setFilteredSuggestions(savedUsernames.slice(0, 5)); // عرض أول 5 اقتراحات فقط
    } else {
      const filtered = savedUsernames.filter(user =>
        user.toLowerCase().includes(username.toLowerCase())
      );
      setFilteredSuggestions(filtered.slice(0, 5)); // عرض أول 5 نتائج فقط
    }
  }, [username, savedUsernames]);

  // دالة لحفظ اسم المستخدم في القائمة
  const saveUsernameToList = (username) => {
    if (!username || username.trim() === "") return;
    
    try {
      const usernameLower = username.toLowerCase();
      
      // التحقق إذا كان الاسم موجوداً بالفعل
      if (!savedUsernames.some(u => u.toLowerCase() === usernameLower)) {
        const updatedUsernames = [username, ...savedUsernames];
        // حفظ أقصى 10 أسماء فقط
        const trimmedList = updatedUsernames.slice(0, 10);
        setSavedUsernames(trimmedList);
        localStorage.setItem("omega_saved_usernames", JSON.stringify(trimmedList));
        console.log("✅ Username added to suggestions:", username);
      }
    } catch (error) {
      console.error("Error saving username:", error);
    }
  };

  // دالة لحفظ بيانات الاعتماد الكاملة
  const saveCredentials = (username, password) => {
    try {
      const credentials = {
        username: username,
        password: password,
        timestamp: Date.now()
      };
      localStorage.setItem("omega_remember_me", JSON.stringify(credentials));
      console.log("✅ Credentials saved for remember me");
    } catch (error) {
      console.error("Error saving credentials:", error);
    }
  };

  // دالة لحذف بيانات الاعتماد المحفوظة
  const clearSavedCredentials = () => {
    try {
      localStorage.removeItem("omega_remember_me");
      console.log("✅ Saved credentials cleared");
    } catch (error) {
      console.error("Error clearing credentials:", error);
    }
  };

  // دالة لاختيار اسم مستخدم من الاقتراحات
  const selectUsername = (selectedUsername) => {
    setUsername(selectedUsername);
    setShowSuggestions(false);
    
    // محاولة تحميل كلمة المرور المحفوظة لهذا المستخدم
    try {
      const savedCredentials = localStorage.getItem("omega_remember_me");
      if (savedCredentials) {
        const credentials = JSON.parse(savedCredentials);
        if (credentials && credentials.username === selectedUsername) {
          setPassword(credentials.password);
          setRememberMe(true);
          toast.info("Password loaded from saved credentials");
        } else {
          setPassword("");
          setRememberMe(false);
        }
      }
    } catch (error) {
      console.error("Error loading credentials for selected user:", error);
    }
  };

  // دالة لحذف اسم مستخدم من الاقتراحات
  const removeUsername = (usernameToRemove) => {
    const updatedUsernames = savedUsernames.filter(u => u !== usernameToRemove);
    setSavedUsernames(updatedUsernames);
    localStorage.setItem("omega_saved_usernames", JSON.stringify(updatedUsernames));
    toast.info(`"${usernameToRemove}" removed from suggestions`);
  };

  // دالة لمسح جميع الاقتراحات
  const clearAllSuggestions = () => {
    if (window.confirm("Are you sure you want to clear all saved usernames?")) {
      setSavedUsernames([]);
      localStorage.removeItem("omega_saved_usernames");
      toast.success("All saved usernames cleared");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isAuthenticated) {
      toast.info("You are already logged in!");
      return;
    }
    
    if (!username.trim() || !password.trim()) {
      toast.error("Please enter both username and password");
      return;
    }
    
    setLoading(true);

    try {
      // إرسال طلب الدخول
      const data = await postData(`${BASE_URL}/login`, {
        username: username,
        password,
      });

      if (data?.message === "Login successful" && data?.user) {
        // استخراج البيانات
        const userUsername = data.user.Username || data.user.username || username;
        const userProjectName = data.user.ProjectName || "My Project";
        
        const displayUsername = username;
        const isAdminUser = userUsername.toLowerCase().includes('admin');
        const userRole = isAdminUser ? 'admin' : 'user';
        
        // تسجيل الدخول
        login(userRole, userProjectName, displayUsername);

        // حفظ اسم المستخدم في القائمة (حتى لو لم يختار Remember Me)
        saveUsernameToList(username);

        // إذا تم اختيار Remember Me، حفظ بيانات الاعتماد الكاملة
        if (rememberMe) {
          saveCredentials(username, password);
          toast.info("Your credentials have been saved for future logins");
        } else {
          clearSavedCredentials();
        }

        // عرض رسالة الترحيب
        if (isAdminUser) {
          toast.success(`Welcome back, Admin ${displayUsername}!`);
          navigate("/homeDashboard", { replace: true });
        } else {
          toast.success(`Welcome back, ${displayUsername}!`);
          navigate("/robots", { replace: true });
        }
      } else {
        toast.error("Invalid username or password");
      }
    } catch (error) {
      console.error("Login error:", error);
      
      // محاولة مع lowercase إذا فشلت الأولى
      if (error.response?.status === 401) {
        try {
          const data = await postData(`${BASE_URL}/login`, {
            username: username.toLowerCase(),
            password,
          });
          
          if (data?.message === "Login successful" && data?.user) {
            const userUsername = data.user.Username || data.user.username || username.toLowerCase();
            const userProjectName = data.user.ProjectName || "My Project";
            
            const displayUsername = username;
            const isAdminUser = userUsername.toLowerCase().includes('admin');
            const userRole = isAdminUser ? 'admin' : 'user';
            
            login(userRole, userProjectName, displayUsername);

            // حفظ اسم المستخدم في القائمة
            saveUsernameToList(username);

            // حفظ بيانات Remember Me إذا تم اختياره
            if (rememberMe) {
              saveCredentials(username, password);
              toast.info("Your credentials have been saved");
            } else {
              clearSavedCredentials();
            }

            if (isAdminUser) {
              toast.success(`Welcome back, Admin ${displayUsername}!`);
              navigate("/homeDashboard", { replace: true });
            } else {
              toast.success(`Welcome back, ${displayUsername}!`);
              navigate("/robots", { replace: true });
            }
            return;
          }
        } catch (secondError) {
          toast.error("Invalid username or password");
        }
      } else {
        toast.error(error.response?.data?.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prevState) => !prevState);
  };

  // زر لتعبئة بيانات تجريبية (للتجربة فقط)
  const fillDemoCredentials = () => {
    setUsername("demo_user");
    setPassword("demo123");
    setRememberMe(true);
    toast.info("Demo credentials filled. Click Sign In to login.");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-main-color/20 via-white to-second-color/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-main-color mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-main-color/20 via-white to-second-color/20 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] bg-main-color/20 rounded-full blur-3xl"
          animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
          transition={{ duration: 8, repeat: Infinity, repeatType: "mirror" }}
        />
        <motion.div
          className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-second-color/20 rounded-full blur-3xl"
          animate={{ x: [0, -100, 0], y: [0, -50, 0] }}
          transition={{ duration: 9, repeat: Infinity, repeatType: "mirror" }}
        />
      </div>

      {/* Form */}
      <motion.div
        className="relative w-full max-w-md p-8"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      >
        <Card className="shadow-2xl border border-gray-100 bg-white rounded-3xl overflow-hidden">
          <CardHeader className="text-center space-y-3">
            <motion.img
              src={LogoImg}
              alt="Omega Logo"
              className="h-16 mx-auto object-contain"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
            />
            <CardTitle className="text-3xl font-extrabold text-main-color tracking-tight">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-gray-500 text-sm">
              Sign in to access your Omega Robotics
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username with Suggestions */}
              <div className="space-y-2 relative">
                <Label htmlFor="username" className="text-gray-700 font-medium">
                  Username
                </Label>
                <div className="relative" ref={usernameRef}>
                  <User
                    className="absolute left-3 top-3 text-gray-400 z-10"
                    size={18}
                  />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Type your username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (e.target.value.trim() !== "") {
                        setShowSuggestions(true);
                      }
                    }}
                    onFocus={() => {
                      if (savedUsernames.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    required
                    className="pl-9 pr-8 bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-main-color focus:border-main-color rounded-xl"
                    autoComplete="off"
                  />
                  {/* {savedUsernames.length > 0 && (
                    <ChevronDown
                      className="absolute right-3 top-3 text-gray-400 cursor-pointer"
                      size={16}
                      onClick={() => setShowSuggestions(!showSuggestions)}
                    />
                  )} */}
                </div>
                
                {/* Suggestions Dropdown */}
                {showSuggestions && savedUsernames.length > 0 && (
                  <div 
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                  >
                    <div className="p-2 border-b border-gray-100 flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-500">
                        Previously used ({savedUsernames.length})
                      </span>
                      <button
                        type="button"
                        onClick={clearAllSuggestions}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Clear all
                      </button>
                    </div>
                    {filteredSuggestions.map((savedUser, index) => (
                      <div
                        key={index}
                        className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                        onClick={() => selectUsername(savedUser)}
                      >
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-gray-400" />
                          <span>{savedUser}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeUsername(savedUser);
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {filteredSuggestions.length === 0 && (
                      <div className="px-3 py-4 text-center text-gray-500">
                        No matching usernames
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-3 text-gray-400"
                    size={18}
                  />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-9 pr-10 bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-main-color focus:border-main-color rounded-xl"
                  />
                  {/* Eye Icon Button */}
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={togglePasswordVisibility}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff size={20} aria-hidden="true" />
                    ) : (
                      <Eye size={20} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-main-color focus:ring-main-color cursor-pointer"
                />
                <Label 
                  htmlFor="rememberMe" 
                  className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2"
                >
                  <Save size={16} className="text-main-color" />
                  Remember me
                </Label>
                <span className="text-xs text-gray-500 ml-auto">
                  {rememberMe ? "Credentials will be saved" : "Credentials won't be saved"}
                </span>
              </div>

              
              {/* Login Button */}
              <motion.div whileHover={{ scale: 1.02 }}>
                <Button
                  type="submit"
                  disabled={loading || isAuthenticated}
                  className="relative w-full py-3 mt-2 text-lg font-semibold 
                             border-2 border-main-color text-white
                             bg-linear-to-r bg-main-color
                             rounded-xl shadow-md hover:shadow-xl transition-all duration-300"
                >
                  <span className="relative z-10">
                    {isAuthenticated ? "Already Logged In" : (loading ? "Logging in..." : "Sign In")}
                  </span>
                </Button>
              </motion.div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
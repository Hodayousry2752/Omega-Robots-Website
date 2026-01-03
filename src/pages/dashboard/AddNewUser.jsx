import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { postData } from "@/services/postServices";
import { putData } from "@/services/putServices";
import { getData } from "@/services/getServices";
import { toast } from "sonner";

export default function AddUser() {
  const navigate = useNavigate();
  const { id } = useParams(); // user id from URL
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [formData, setFormData] = useState({
    Username: "",
    Email: "",
    Password: "",
    mainrobot_password: "",
    TelephoneNumber: "",
    ProjectName: "",
  });

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [accessPassword, setAccessPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const ACCESS_PASSWORD = "Robot@2022"; 

  // Fetch user data if editing
  useEffect(() => {
    if (id) {
      const fetchUser = async () => {
        try {
          const userData = await getData(`${BASE_URL}/users/${id}`);
          setFormData({
            Username: userData.Username || "",
            Email: userData.Email || "",
            Password: userData.Password || "",
            mainrobot_password: userData.mainrobot_password || "",
            TelephoneNumber: userData.TelephoneNumber || "",
            ProjectName: userData.ProjectName || "",
          });
        } catch (error) {
          toast.error("Failed to fetch user data");
        }
      };
      fetchUser();
    }
  }, [id, BASE_URL]);

  // Fetch projects from API
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setProjectsLoading(true);
        const projectsData = await getData(`${BASE_URL}/projects.php`);
        setProjects(projectsData || []);
      } catch (error) {
        toast.error("Failed to load projects");
        setProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    };

    fetchProjects();
  }, [BASE_URL]);

  const handlePasswordSubmit = () => {
    if (accessPassword === ACCESS_PASSWORD) {
      setIsUnlocked(true);
      toast.success("User form has been successfully unlocked.");
      setAccessPassword("");
    } else {
      toast.error("Incorrect password");
      setAccessPassword("");
    }
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const submitData = { ...formData };
      if (!submitData.Password) delete submitData.Password;

      if (id) {
        // Edit existing user
        await putData(`${BASE_URL}/users/${id}`, submitData);
        toast.success("User updated successfully!");
      } else {
        // Add new user
        if (!submitData.Password) {
          toast.error("Password is required for new users");
          setLoading(false);
          return;
        }
        await postData(`${BASE_URL}/users`, submitData);
        toast.success("User added successfully!");
      }
      navigate("/homeDashboard/allUsers");
    } catch (error) {
      toast.error("Failed to submit user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6 flex justify-center">
      <div className="w-full max-w-2xl relative">
        <Button
          onClick={() => navigate(-1)}
          className="absolute -top-10 left-0 flex items-center gap-2 bg-transparent text-main-color border border-main-color hover:bg-main-color/10 cursor-pointer"
        >
          <ArrowLeft size={18} />
          Back
        </Button>

        <Card className="shadow-xl border border-gray-100 rounded-2xl p-6 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-semibold text-gray-800 text-center">
              {id ? "Edit User" : "Add New User"}
            </CardTitle>
            <p className="text-center text-gray-500 text-sm mt-1">
              Fill in the required information below
            </p>
          </CardHeader>

          <CardContent>
            {!isUnlocked ? (
              // Password Input Section
              <div className="mt-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-main-color mb-4 text-center">
                  Enter password to access user form
                </h3>
                <div className="flex max-md:flex-col gap-3 items-center">
                  <Input
                    type="password"
                    value={accessPassword}
                    onChange={(e) => setAccessPassword(e.target.value)}
                    placeholder="Enter the password"
                    className="flex-1 h-12 border-gray-300 focus:border-main-color focus:ring-main-color rounded-xl"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handlePasswordSubmit();
                      }
                    }}
                  />
                  <Button
                    onClick={handlePasswordSubmit}
                    className="h-12 bg-main-color text-white hover:bg-main-color/90"
                  >
                    Unlock
                  </Button>
                </div>
              </div>
            ) : (
              // User Form (Unlocked)
              <form
                onSubmit={handleSubmit}
                className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6"
              >
                {/* Full Name */}
                <div className="flex flex-col space-y-2 sm:col-span-2">
                  <Label htmlFor="Username" className="text-gray-700 font-medium">
                    Full Name
                  </Label>
                  <Input
                    id="Username"
                    value={formData.Username}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    className="h-12 border-gray-300 focus:border-main-color focus:ring-main-color rounded-xl"
                    required
                  />
                </div>

                {/* Email */}
                <div className="flex flex-col space-y-2 sm:col-span-2">
                  <Label htmlFor="Email" className="text-gray-700 font-medium">
                    Email
                  </Label>
                  <Input
                    id="Email"
                    type="email"
                    value={formData.Email}
                    onChange={handleChange}
                    placeholder="Enter email address"
                    className="h-12 border-gray-300 focus:border-main-color focus:ring-main-color rounded-xl"
                    required
                  />
                </div>

                {/* Password */}
                <div className="flex flex-col space-y-2 sm:col-span-2">
                  <Label htmlFor="Password" className="text-gray-700 font-medium">
                    Password
                  </Label>
                  <Input
                    id="Password"
                    type="text"
                    value={formData.Password}
                    onChange={handleChange}
                    placeholder={
                      id
                        ? "Leave empty to keep current password"
                        : "Enter password"
                    }
                    className="h-12 border-gray-300 focus:border-main-color focus:ring-main-color rounded-xl"
                    required={!id}
                  />
                </div>

                {/* Main Robot Password */}
                <div className="flex flex-col space-y-2 sm:col-span-2">
                  <Label htmlFor="mainrobot_password" className="text-gray-700 font-medium">
                    Main Robot Password
                  </Label>
                  <Input
                    id="mainrobot_password"
                    type="text"
                    value={formData.mainrobot_password}
                    onChange={handleChange}
                    placeholder="Enter main robot password"
                    className="h-12 border-gray-300 focus:border-main-color focus:ring-main-color rounded-xl"
                  />
                </div>

                {/* Telephone */}
                <div className="flex flex-col space-y-2 sm:col-span-2">
                  <Label
                    htmlFor="TelephoneNumber"
                    className="text-gray-700 font-medium"
                  >
                    Phone Number
                  </Label>
                  <Input
                    id="TelephoneNumber"
                    type="tel"
                    value={formData.TelephoneNumber}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                    className="h-12 border-gray-300 focus:border-main-color focus:ring-main-color rounded-xl"
                  />
                </div>

                {/* Project Name - Dropdown */}
                <div className="flex flex-col space-y-2 sm:col-span-2">
                  <Label
                    htmlFor="ProjectName"
                    className="text-gray-700 font-medium"
                  >
                    Project Name
                  </Label>
                  <select
                    id="ProjectName"
                    value={formData.ProjectName}
                    onChange={handleChange}
                    className="h-12 border border-gray-300 focus:border-main-color focus:ring-main-color rounded-xl px-3 bg-white transition-colors"
                    required
                  >
                    <option value="">Select a project</option>
                    {projectsLoading ? (
                      <option value="" disabled>Loading projects...</option>
                    ) : (
                      projects.map((project) => (
                        <option key={project.id || project.projectId} value={project.ProjectName || project.name}>
                          {project.ProjectName || project.name}
                        </option>
                      ))
                    )}
                  </select>
                  {projects.length === 0 && !projectsLoading && (
                    <p className="text-sm text-gray-500 mt-1">
                      No projects available. Please add projects first.
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="sm:col-span-2 flex justify-center pt-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-1/2 h-12 bg-main-color text-white text-lg rounded-xl hover:bg-main-color/90 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Saving..." : (id ? "Update User" : "Add User")}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
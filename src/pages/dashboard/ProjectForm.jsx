import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, Save, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import ProjectImg from "../../assets/Robot1.jpg";

export default function ProjectForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL;

  const [formData, setFormData] = useState({
    ProjectName: "",
    Location: "",
    Description: "",
    Image: null,
    imagePreview: editing ? null : ProjectImg, 
    existingImage: "", 
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchProjectData = async () => {
    if (!editing) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/projects/${id}`);
      const data = await res.json();
      if (data) {
        setFormData({
          ProjectName: data.ProjectName || "",
          Location: data.Location || "",
          Description: data.Description || "",
          Image: null,
          existingImage: data.Image || "", 
          imagePreview: data.Image ? `${UPLOADS_URL}/${data.Image}` : null,
        });
      }
    } catch (error) {
      console.error("Error fetching project:", error);
      toast.error("Failed to load project data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "Image" && files && files[0]) {
      const file = files[0];
      setFormData({
        ...formData,
        Image: file,
        imagePreview: URL.createObjectURL(file),
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const convertImageUrlToFile = async (imageUrl, fileName) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      return new File([blob], fileName, { type: blob.type });
    } catch (error) {
      console.error("Error converting image to file:", error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!editing && (!formData.ProjectName || !formData.Location || !formData.Description)) {
      toast.warning("Please fill all required fields!", {
        icon: <XCircle className="text-yellow-500" />,
      });
      return;
    }

    setSubmitting(true);

    try {
      let url, options;
      
      if (editing) {
        // تعديل مشروع موجود
        const payload = {
          id: id,
          ProjectName: formData.ProjectName || "",
          Location: formData.Location || "",
          Description: formData.Description || "",
        };
        
        if (formData.Image) {
          const base64Image = await convertToBase64(formData.Image);
          payload.ImageBase64 = base64Image;
          payload.imageAction = "update";
        } else if (formData.existingImage) {
          payload.imageAction = "keep";
          payload.existingImage = formData.existingImage;
        } else {
          
          try {
            const defaultImageFile = await convertImageUrlToFile(ProjectImg, "Project1.jpg");
            if (defaultImageFile) {
              const base64Image = await convertToBase64(defaultImageFile);
              payload.ImageBase64 = base64Image;
              payload.imageAction = "update";
              console.log("✅ Default image added to existing project");
            }
          } catch (error) {
            console.error("Failed to add default image to existing project:", error);
          }
        }
        
        url = `${BASE_URL}/projects.php/${id}`;
        options = {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        };
        
        console.log("📤 Sending JSON payload for UPDATE:", payload);
      } else {
        const fd = new FormData();
        fd.append("ProjectName", formData.ProjectName);
        fd.append("Location", formData.Location);
        fd.append("Description", formData.Description);
        
        if (formData.Image) {
          fd.append("Image", formData.Image);
        } else {
          try {
            const defaultImageFile = await convertImageUrlToFile(ProjectImg, "Project1.jpg");
            if (defaultImageFile) {
              fd.append("Image", defaultImageFile);
              console.log("✅ Default image added to new project");
            }
          } catch (error) {
            console.error("Failed to add default image to new project:", error);
          }
        }
        
        url = `${BASE_URL}/projects.php`;
        options = {
          method: "POST",
          body: fd
        };
        
        console.log("📤 Sending FormData for ADD");
      }

      const res = await fetch(url, options);
      
      let data;
      try {
        const text = await res.text();
        console.log("📥 Raw server response:", text);
        data = JSON.parse(text);
      } catch (parseError) {
        console.error("Failed to parse JSON:", parseError);
        throw new Error("Invalid server response");
      }

      console.log("📥 Parsed server response:", data);

      if (data.message && data.message.toLowerCase().includes("success")) {
        toast.success(editing ? "Project updated successfully!" : "Project added successfully!", {
          icon: <CheckCircle2 className="text-green-500" />,
        });
        setTimeout(() => navigate("/projects"), 1500);
      } else {
        toast.error(data.message || "Something went wrong!", {
          icon: <XCircle className="text-red-500" />,
        });
      }
    } catch (error) {
      console.error("❌ Error saving project:", error);
      toast.error("Network error. Please try again.", {
        icon: <XCircle className="text-red-500" />,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleRemoveImage = () => {
    setFormData({
      ...formData,
      Image: null,
      imagePreview: ProjectImg,
    });
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-main-color" />
        <span className="ml-2">Loading project data...</span>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-6 sm:p-10">
      <div className="max-w-5xl w-full mx-auto mb-6 flex justify-start">
        <Button
          onClick={() => navigate(-1)}
          className="cursor-pointer flex items-center gap-2 bg-main-color text-white hover:bg-white hover:text-main-color border border-main-color rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
          disabled={submitting}
        >
          <ArrowLeft size={18} /> Back
        </Button>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        onSubmit={handleSubmit}
        className="max-w-5xl w-full mx-auto bg-white/80 backdrop-blur-md border border-gray-200 shadow-2xl rounded-3xl p-8 sm:p-10 flex flex-col gap-10"
      >
        <h1 className="text-3xl font-bold text-main-color text-center">
          {editing ? `Edit Project ${formData.ProjectName}` : "Add New Project"}
        </h1>

        <div className="flex flex-col md:flex-row gap-10">
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl p-6 hover:border-main-color transition relative">
            {formData.imagePreview ? (
              <div className="w-full">
                <img
                  src={formData.imagePreview}
                  alt="Preview"
                  className="w-full h-56 object-cover rounded-xl shadow-md mb-2"
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-sm text-gray-600">
                    {formData.Image 
                      ? "New image selected" 
                      : (formData.existingImage ? "Current image" : "Default image")}
                  </p>
                  {formData.Image && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveImage}
                      disabled={submitting}
                      className="text-xs"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-center">
                <Upload size={40} className="mx-auto mb-3" />
                <p>Upload project image</p>
                <p className="text-sm text-gray-500 mt-2">
                  {editing 
                    ? "(Leave empty to keep current image or use default)" 
                    : "(Will use default image if not uploaded)"}
                </p>
              </div>
            )}
            <input
              id="Image"
              type="file"
              name="Image"
              accept="image/*"
              onChange={handleChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={submitting}
            />
          </div>

          <div className="flex-1 flex flex-col gap-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Project Name
              </label>
              <Input
                type="text"
                name="ProjectName"
                value={formData.ProjectName}
                onChange={handleChange}
                placeholder="Enter project name"
                required={!editing} 
                disabled={submitting}
                className="cursor-pointer border-gray-300 focus:ring-2 focus:ring-main-color rounded-xl"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Location
              </label>
              <Input
                type="text"
                name="Location"
                value={formData.Location}
                onChange={handleChange}
                placeholder="Enter location"
                required={!editing} 
                disabled={submitting}
                className="cursor-pointer border-gray-300 focus:ring-2 focus:ring-main-color rounded-xl"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Description
              </label>
              <Textarea
                name="Description"
                value={formData.Description}
                onChange={handleChange}
                placeholder="Describe the project..."
                rows={5}
                required={!editing} 
                disabled={submitting}
                className="cursor-pointer border-gray-300 focus:ring-2 focus:ring-main-color rounded-xl"
              />
            </div>

            <div className="pt-4 flex flex-col gap-4">
              
              
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  disabled={submitting}
                  className="border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || (!editing && (!formData.ProjectName || !formData.Location || !formData.Description))}
                  className="cursor-pointer flex items-center gap-2 bg-second-color text-white border border-second-color hover:bg-white hover:text-second-color px-6 py-3 rounded-2xl shadow-md hover:shadow-lg text-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {editing ? "Updating..." : "Adding..."}
                    </>
                  ) : (
                    <>
                      <Save size={22} />
                      {editing ? "Update Project" : "Add Project"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.form>
    </div>
  );
}
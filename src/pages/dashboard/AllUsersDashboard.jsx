import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Edit3, Trash2, UserPlus, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getData } from "../../services/getServices";
import { deleteData } from "../../services/deleteServices";
import AddUser from "./AddNewUser";

// --------------------- Confirm Delete Modal ---------------------
function ConfirmDeleteModal({ user, onConfirm, onCancel, deleteAll = false }) {
  return (
    <AnimatePresence>
      {(user || deleteAll) && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: -30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -30 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-2xl p-8 w-[90%] max-w-md text-center border border-gray-200"
          >
            <XCircle
              size={48}
              className="mx-auto text-second-color mb-4 animate-pulse"
            />
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Confirm Delete
            </h2>
            <p className="text-gray-600 mb-6">
              {deleteAll ? (
                <>
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-main-color">
                    all users
                  </span>
                  ? This action cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-main-color">
                    {user?.Username}
                  </span>
                  ? This action cannot be undone.
                </>
              )}
            </p>
            <div className="flex justify-center gap-4">
              <Button
                onClick={onCancel}
                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 px-6 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={() => onConfirm(deleteAll ? null : user.id)}
                className="bg-secondtext-second-color text-second-color hover:text-second-color border border-secondtext-second-color px-6 rounded-xl transition-all cursor-pointer"
              >
                Confirm
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --------------------- Admin Protection Modal ---------------------
function AdminProtectionModal({ onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: -30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: -30 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl shadow-2xl p-8 w-[90%] max-w-md text-center border border-gray-200"
        >
          <AlertCircle
            size={48}
            className="mx-auto text-yellow-500 mb-4"
          />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Cannot Delete Last Admin
          </h2>
          <p className="text-gray-600 mb-6">
            This is the last existing admin user. The system must have at least one admin user for management purposes.
          </p>
          <div className="flex justify-center">
            <Button
              onClick={onClose}
              className="bg-main-color text-white hover:bg-main-color/90 px-6 rounded-xl transition-all cursor-pointer"
            >
              OK
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Helper function to check if a user is admin based on username
const isAdminUser = (user) => {
  return user?.Username?.toLowerCase().includes('admin');
};

// --------------------- Users List ---------------------
function AllUsers({ users, onDeleteClick, onDeleteAll }) {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">All Users</h1>

        <div className="flex gap-3">
          <Button
            onClick={() => navigate(`/homeDashboard/addUser`)}
            className="flex items-center gap-2 bg-main-color text-white border border-main-color rounded-xl transition-all cursor-pointer"
          >
            <UserPlus size={18} />
            Add User
          </Button>

          {users.length > 0 && (
            <Button
              onClick={onDeleteAll}
              className="flex items-center gap-2 bg-second-color text-white border border-second-color rounded-xl transition-all cursor-pointer"
            >
              <Trash2 size={18} />
              Delete All Users
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {users.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white shadow-lg rounded-2xl border border-gray-200 p-6 flex flex-col items-center text-center hover:shadow-2xl transition-all duration-300"
          >
            <h2 className="text-lg font-semibold text-gray-800 mb-1">
              {user.Username}
            </h2>
            
            {/* Display admin badge if username contains "admin" */}
            {isAdminUser(user) && (
              <div className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold mb-3">
                Administrator
              </div>
            )}

            <div className="text-left w-full border-t border-gray-100 pt-3 text-sm text-gray-600 space-y-1">
              <p>
                <strong className="text-main-color">Project:</strong>{" "}
                {user.ProjectName}
              </p>
              <p>
                <strong className="text-main-color">Password:</strong>{" "}
                {user.Password}
              </p>
              <p>
                <strong className="text-main-color">Main Robot Password:</strong>{" "}
                {user.mainrobot_password || "Not set"}
              </p>
              <p>
                <strong className="text-main-color">Phone:</strong>{" "}
                {user.TelephoneNumber}
              </p>
              <p className="text-sm text-gray-500 mb-2 overflow-clip">
                <strong className="text-main-color">Email:</strong>{" "}
                {user.Email}
              </p>
            </div>

            <div className="flex gap-2 mt-5">
              <Button
                className="p-2 w-10 h-10 flex items-center justify-center rounded-md bg-main-color text-white transition-colors cursor-pointer"
                onClick={() =>
                  navigate(`/homeDashboard/editUser/${user.id}`, {
                    state: { user },
                  })
                }
              >
                <Edit3 size={16} />
              </Button>

              <Button
                onClick={() => onDeleteClick(user)}
                className="p-2 w-10 h-10 flex items-center justify-center rounded-md bg-secondtext-second-color text-second-color cursor-pointer hover:text-second-color border border-secondtext-second-color transition-colors"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// --------------------- Users Dashboard ---------------------
export default function UsersDashboard() {
  const [users, setUsers] = useState([]);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteAll, setDeleteAll] = useState(false);
  const [showAdminProtection, setShowAdminProtection] = useState(false);
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const location = useLocation();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getData(`${BASE_URL}/users`);
        setUsers(Array.isArray(response) ? response : response?.data || []);
      } catch (error) {
      }
    };
    fetchUsers();
  }, []);

  const handleDeleteUser = async (id) => {
    try {
      // Find the user being deleted
      const userToDeleteObj = users.find(user => user.id === id);
      
      // Check if the user is an admin (username contains "admin")
      if (userToDeleteObj && isAdminUser(userToDeleteObj)) {
        // Count how many admin users exist
        const adminCount = users.filter(user => isAdminUser(user)).length;
        
        // If this is the last admin, show protection modal and return
        if (adminCount === 1) {
          setShowAdminProtection(true);
          setUserToDelete(null);
          return;
        }
      }
      
      // Proceed with deletion if not the last admin
      await deleteData(`${BASE_URL}/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (error) {
    } finally {
      setUserToDelete(null);
    }
  };

  const handleDeleteAllUsers = async () => {
    try {
      // Count admin users
      const adminCount = users.filter(user => isAdminUser(user)).length;
      const totalUsers = users.length;
      
      // If all users are admins (or this would delete all admins), show protection
      if (adminCount > 0 && adminCount === totalUsers) {
        setShowAdminProtection(true);
        setDeleteAll(false);
        return;
      }
      
      // Proceed with deletion
      await deleteData(`${BASE_URL}/users`);
      setUsers([]);
    } catch (error) {
    } finally {
      setDeleteAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="flex-1 flex flex-col min-h-screen overflow-auto relative">
        <Routes>
          <Route
            path="/"
            element={
              <AllUsers
                users={users}
                onDeleteClick={(user) => setUserToDelete(user)}
                onDeleteAll={() => setDeleteAll(true)}
              />
            }
          />

          {/* Add/Edit User Route */}
          <Route
            path="/addUser"
            element={<AddUser user={location.state?.user} />}
          />
        </Routes>

        {/* Confirm Delete Single */}
        <ConfirmDeleteModal
          user={userToDelete}
          onConfirm={handleDeleteUser}
          onCancel={() => setUserToDelete(null)}
        />

        {/* Confirm Delete All */}
        <ConfirmDeleteModal
          deleteAll={deleteAll}
          onConfirm={handleDeleteAllUsers}
          onCancel={() => setDeleteAll(false)}
        />

        {/* Admin Protection Modal */}
        {showAdminProtection && (
          <AdminProtectionModal onClose={() => setShowAdminProtection(false)} />
        )}
      </div>
    </div>
  );
}
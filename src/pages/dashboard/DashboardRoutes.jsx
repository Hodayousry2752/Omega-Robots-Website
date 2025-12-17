import { Routes, Route } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import HomeDashboard from "./HomeDashboard";
import ProjectDetails from "./ProjectDetails";
import imgRobot from "../../assets/Robot1.jpg";
import RobotDetails from "./RobotDetails";
import ProjectForm from "./ProjectForm";
import AllUsersDashboard from "./AllUsersDashboard";
import AddUser from "./AddNewUser";
import RobotForm from "./AddRobot";
import RobotSettings from "./RobotSetting";
import ButtonSetting from "./ButtonSetting";
import TrolleySettings from "./TrolleySettings";
import UserDetails from "./UserDetails";
import EditRobot from "./EditRobotWTrolley";
import AddRobotOnly from "./AddRobotOnly";
import AddRobotWithTrolley from "./AddRobotWithTrolley";
import Login from "@/pages/Login";

const initialProjects = [
  {
    id: 1,
    title: "AI Control System",
    description: "An intelligent system that manages robot behaviors autonomously.",
    image: imgRobot,
    location: "Cairo, Egypt",
  },
  {
    id: 2,
    title: "Robot Navigation",
    description: "Developing pathfinding algorithms for indoor environments.",
    image: imgRobot,
    location: "Dubai, UAE",
  },
  {
    id: 3,
    title: "Sensor Upgrade",
    description: "Upgrading sensors for higher precision and better obstacle detection.",
    image: imgRobot,
    location: "Berlin, Germany",
  },
];
const initialRobots = [
  {
    id: 1,
    name: "Omega Robot X1",
    description: "Autonomous robot for smart factory automation and precision control.",
    project: "AI Control System",
    image: imgRobot,
    buttons: [
      { label: "STOP", color: "red" },
      { label: "START", color: "green" },
      { label: "BACKWARD", color: "yellow" },
      { label: "SCHEDULING", color: "sky" },
      { label: "FORWARD", color: "indigo" },
    ],
  },
];


export default function Dashboard() {
  const projects = initialProjects;
  const robots =initialRobots;
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<HomeDashboard projects={projects} />} />
        <Route path="projectDetails/:id" element={<ProjectDetails projects={projects} />} />
        <Route path="robotDetails/:id" element={<RobotDetails />} />
        <Route path="projectForm" element={<ProjectForm/>} />
        <Route path="projectForm/:id" element={<ProjectForm />} />
        <Route path="addRobotw/:id" element={<AddRobotWithTrolley/>} />
        <Route path="addRobotOnly/:id" element={<AddRobotOnly/>} />
        <Route path="allUsers" element={<AllUsersDashboard/>} />
        <Route path="user/:id" element={<UserDetails />} />
        <Route path="adduser" element={<AddUser/>} />
        <Route path="edituser/:id" element={<AddUser/>} />
        <Route path="addRobot/:id" element={<RobotForm />} />
        <Route path="editRobot/:id" element={<EditRobot />} />
        <Route path="robotSettings/:id" element={<RobotSettings  />} />
        <Route path="trolleySettings/:id" element={<TrolleySettings />} />

        <Route
          path="robotSettings/:id/button/:buttonId"
          element={<ButtonSetting  />}
        />
        <Route
          path="trolleySettings/:id/button/:buttonId"
          element={<ButtonSetting  />}
        />

      </Routes>
    </DashboardLayout>
  );
}

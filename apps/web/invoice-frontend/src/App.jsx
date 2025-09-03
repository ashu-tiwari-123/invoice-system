import AppRoutes from "./routes/AppRoutes";
import useAuth from "./hooks/useAuth";

function App() {
  useAuth(); // keeps Redux synced with Firebase
  return <AppRoutes />;
}

export default App;

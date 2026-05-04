import { createBrowserRouter, Navigate } from "react-router-dom";
import { App } from "./App";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";

import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { VerifyEmail } from "./pages/VerifyEmail";
import { Home } from "./pages/Home";
import { Market } from "./pages/Market";
import { Signal } from "./pages/Signal";
import { Stats } from "./pages/Stats";
import { MyStats } from "./pages/MyStats";
import { VIPAutoTrading } from "./pages/VIPAutoTrading";
import { Admin } from "./pages/Admin";
import { Checkout } from "./pages/Checkout";
import { VIP } from "./pages/VIP";
import { Settings } from "./pages/Settings";
import { Tools } from "./pages/Tools";
import { SettingsDetail } from "./pages/SettingsDetail";
import { Results } from "./pages/Results";
import { Chart } from "./pages/Chart";
import { Welcome } from "./pages/Welcome";
import { AgeVerification } from "./pages/AgeVerification";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { Privacy } from "./pages/Privacy";
import { Terms } from "./pages/Terms";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/welcome" replace />,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "register",
        element: <Register />,
      },
      {
        path: "verify-email",
        element: <VerifyEmail />,
      },
      {
        path: "forgot-password",
        element: <ForgotPassword />,
      },
      {
        path: "reset-password",
        element: <ResetPassword />,
      },
      {
        path: "welcome",
        element: <Welcome />,
      },
      {
        path: "age-verification",
        element: <AgeVerification />,
      },
      {
        path: "privacy",
        element: <Privacy />,
      },
      {
        path: "terms",
        element: <Terms />,
      },
      {
        path: "app",
        element: (
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <Home />,
          },
          {
            path: "home",
            element: <Home />,
          },
          {
            path: "market",
            element: <Market />,
          },
          {
            path: "signal",
            element: <Signal />,
          },
          {
            path: "stats",
            element: <Stats />,
          },
          {
            path: "my-stats",
            element: <MyStats />,
          },
          {
            path: "vip-auto",
            element: <VIPAutoTrading />,
          },
          {
            path: "admin",
            element: <Admin />,
          },
          {
            path: "vip",
            element: <VIP />,
          },
          {
            path: "checkout",
            element: <Checkout />,
          },
          {
            path: "privacy",
            element: <Privacy />,
          },
          {
            path: "terms",
            element: <Terms />,
          },
          {
            path: "tools",
            element: <Tools />,
          },
          {
            path: "settings",
            element: <Settings />,
          },
          {
            path: "settings-detail",
            element: <SettingsDetail />,
          },
          {
            path: "results",
            element: <Results />,
          },
          {
            path: "chart",
            element: <Chart />,
          },
        ],
      },
      {
        path: "*",
        element: <Navigate to="/welcome" replace />,
      },
    ],
  },
]);
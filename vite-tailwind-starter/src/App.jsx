import Header from "./components/Header";
import React, { useState, useEffect } from "react";
import axios from "axios";

export default function App() {

  const [verified, setVerified] = useState(null);
  const [error, setError] = useState(null);
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    localStorage.removeItem("cir_file_name");
    localStorage.removeItem("gds_file_name");
  }, []);


  useEffect(() => {
    if (window.location.hostname === "localhost") {
      console.log("Debug: verification skipped in development");
      setVerified(true); // Skip verification
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("token");
    const accessToken = localStorage.getItem("access_token");

    const cleanURL = () => {
      window.history.replaceState({}, document.title, window.location.pathname);
    };

    const verifyWithUrlToken = async () => {
      try {
        const res = await axios.post(
          `${API_BASE_URL}/auth/verify-token`,
          { token: urlToken },
          { withCredentials: true }
        );
        localStorage.setItem("access_token", res.data.access_token);
        setVerified(true);
        cleanURL();
      } catch (err) {
        setError(err.response?.data?.msg || "Token verification failed");
        setVerified(false);
      }
    };

    const verifyWithAccessToken = async () => {
      try {
        await axios.post(`${API_BASE_URL}/auth/verify-token`, {
          token: accessToken,
        });
        setVerified(true);
      } catch (err) {
        if (err.response?.status === 401) {
          await refreshAccessToken();
        } else {
          setError(err.response?.data?.msg || "Invalid access token");
          setVerified(false);
        }
      }
    };

    const refreshAccessToken = async () => {
      try {
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        localStorage.setItem("access_token", res.data.access_token);
        setVerified(true);
      } catch (err) {
        setError("Session expired. Please login again.");
        setVerified(false);
      }
    };

    const runVerification = async () => {
      if (urlToken) {
        await verifyWithUrlToken();
      } else if (accessToken) {
        await verifyWithAccessToken();
      } else {
        setError("No token provided");
        setVerified(false);
      }
    };

    runVerification();
  }, [API_BASE_URL]);

  if (window.location.hostname !== "localhost") {
    if (verified === null)
      return (
        <div style={{ padding: 20, color: "white" }}>🔒 Verifying token...</div>
      );
    if (!verified)
      return <div style={{ padding: 20, color: "red" }}>❌ {error}</div>;
  }
  return (
    <div className="min-h-screen bg-black text-gray-100">
      <Header />

    </div>
  );
}

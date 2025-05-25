import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Login successful");
      setError("");
      navigate("/UserInfo");
    } catch (err) {
      setError("Failed to login. Check your credentials.");
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!email || !password || !firstName || !lastName || !dob) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        firstName,
        lastName,
        email,
        dob,
        uid: user.uid,
      });

      console.log("✅ Account created successfully");
      setError("");
      navigate("/UserInfo");
    } catch (err) {
      setError("Failed to create account. Please try again.");
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      console.log("Google Authentication successful", user);

      try {
        const userDocRef = doc(db, "users", user.uid);
        console.log("Attempting to save user data to:", userDocRef.path);

        const userData = {
          firstName: user.displayName?.split(" ")[0] || "",
          lastName: user.displayName?.split(" ")[1] || "",
          email: user.email,
          uid: user.uid,
          lastSignIn: new Date().toISOString(),
        };

        console.log("User data to save:", userData);

        await setDoc(userDocRef, userData, { merge: true });
        console.log("✅ User document created/updated in Firestore");
        navigate("/UserInfo");
      } catch (firestoreError) {
        console.error("Detailed Firestore Error:", {
          code: firestoreError.code,
          message: firestoreError.message,
          name: firestoreError.name,
          stack: firestoreError.stack,
        });

        if (firestoreError.code === "permission-denied") {
          setError("Permission denied. Please check Firestore rules.");
        } else if (firestoreError.code === "unavailable") {
          setError(
            "Database is currently unavailable. Please try again later."
          );
        } else {
          setError(`Database error: ${firestoreError.message}`);
        }
      }
    } catch (error) {
      console.error("Google Sign-in Error:", error.code, error.message);
      if (error.code === "auth/popup-closed-by-user") {
        setError("Sign-in cancelled. Please try again.");
      } else if (error.code === "auth/popup-blocked") {
        setError("Pop-up was blocked. Please allow pop-ups for this site.");
      } else {
        setError(`Failed to sign in: ${error.message}`);
      }
    }
  };

  return (
    <div
      className="login-page min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: "#FFF3E0" }}
    >
      {/* Background subtle pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-32 left-32 w-40 h-40 rounded-full bg-gradient-to-br from-amber-200 to-amber-300"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 rounded-full bg-gradient-to-br from-amber-100 to-amber-200"></div>
        <div className="absolute top-1/2 left-10 w-24 h-24 rounded-full bg-gradient-to-br from-amber-150 to-amber-250"></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto p-6">
        {/* Header with Logo */}
        <div className="text-center mb-8 animate-fade-in-up">
          <h1
            className="text-4xl font-bold mb-2 tracking-wider"
            style={{
              color: "#3E2723",
              fontFamily: "'Playfair Display', serif",
              textShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            Hada.ai
          </h1>
          <div
            className="text-xl mb-4 opacity-80"
            style={{
              color: "#5D4037",
              fontFamily: "'Playfair Display', serif",
              direction: "rtl",
            }}
          >
            هداياـــي
          </div>

          {/* Elegant divider */}
          <div className="flex items-center justify-center mb-6">
            <div className="h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent w-20"></div>
            <div className="mx-3 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-lg"></div>
            <div className="h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent w-20"></div>
          </div>
        </div>

        {/* Main Form Container */}
        <div className="animate-fade-in-up animation-delay-200">
          <form
            onSubmit={isCreatingAccount ? handleCreateAccount : handleLogin}
            className="p-8 rounded-2xl shadow-2xl backdrop-blur-sm border border-opacity-20"
            style={{
              backgroundColor: "rgba(255, 227, 179, 0.8)",
              borderColor: "#D4A373",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
            }}
          >
            <h2
              className="text-2xl font-semibold mb-6 text-center tracking-wide"
              style={{
                color: "#3E2723",
                fontFamily: "'Playfair Display', serif",
              }}
            >
              {isCreatingAccount ? "Create Your Account" : "Welcome Back"}
            </h2>

            {error && (
              <div
                className="mb-6 p-4 rounded-xl border-2 animate-shake"
                style={{
                  backgroundColor: "rgba(139, 110, 99, 0.1)",
                  borderColor: "#8D6E63",
                  backdropFilter: "blur(10px)",
                }}
              >
                <p
                  className="text-sm text-center font-medium"
                  style={{ color: "#5D4037" }}
                >
                  {error}
                </p>
              </div>
            )}

            {/* Google Sign-in Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="group w-full py-4 rounded-full font-medium mb-6 bg-white border-2 border-opacity-30 flex items-center justify-center transform transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
              style={{ borderColor: "#D4A373" }}
            >
              <img
                src="https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/dark/google-color.png"
                alt="Google Logo"
                className="w-5 h-5 mr-3"
              />
              <span style={{ color: "#5D4037" }}>
                {isCreatingAccount
                  ? "Sign up with Google"
                  : "Sign in with Google"}
              </span>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-200 to-amber-300 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </button>

            {/* OR Separator */}
            <div className="or-separator my-6 flex items-center">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent"></div>
              <span
                className="px-4 text-sm font-medium"
                style={{ color: "#8D6E63" }}
              >
                or
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent"></div>
            </div>

            {/* Registration Fields */}
            {isCreatingAccount && (
              <div className="space-y-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "#5D4037" }}
                    >
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full p-4 rounded-xl border-2 border-opacity-30 focus:border-opacity-60 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-amber-200"
                      style={{
                        backgroundColor: "rgba(255, 243, 224, 0.8)",
                        borderColor: "#D4A373",
                        color: "#3E2723",
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "#5D4037" }}
                    >
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full p-4 rounded-xl border-2 border-opacity-30 focus:border-opacity-60 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-amber-200"
                      style={{
                        backgroundColor: "rgba(255, 243, 224, 0.8)",
                        borderColor: "#D4A373",
                        color: "#3E2723",
                      }}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "#5D4037" }}
                  >
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full p-4 rounded-xl border-2 border-opacity-30 focus:border-opacity-60 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-amber-200"
                    style={{
                      backgroundColor: "rgba(255, 243, 224, 0.8)",
                      borderColor: "#D4A373",
                      color: "#3E2723",
                    }}
                    required
                  />
                </div>
              </div>
            )}

            {/* Email & Password Fields */}
            <div className="space-y-4 mb-6">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#5D4037" }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-4 rounded-xl border-2 border-opacity-30 focus:border-opacity-60 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-amber-200"
                  style={{
                    backgroundColor: "rgba(255, 243, 224, 0.8)",
                    borderColor: "#D4A373",
                    color: "#3E2723",
                  }}
                  requi
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#5D4037" }}
                >
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 rounded-xl border-2 border-opacity-30 focus:border-opacity-60 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-amber-200"
                  style={{
                    backgroundColor: "rgba(255, 243, 224, 0.8)",
                    borderColor: "#D4A373",
                    color: "#3E2723",
                  }}
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="group w-full py-4 rounded-full font-medium text-lg tracking-wide transform transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl mb-6"
              style={{
                background: "linear-gradient(135deg, #5D4037 0%, #3E2723 100%)",
                color: "#FFF3E0",
              }}
            >
              <span className="relative z-10">
                {isCreatingAccount ? "Create Account" : "Sign In"}
              </span>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </button>

            {/* Toggle between Login & Signup */}
            <div className="text-center">
              <p className="text-sm" style={{ color: "#8D6E63" }}>
                {isCreatingAccount ? (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setIsCreatingAccount(false)}
                      className="font-medium underline hover:no-underline transition-all duration-300"
                      style={{ color: "#5D4037" }}
                    >
                      Sign in here
                    </button>
                  </>
                ) : (
                  <>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setIsCreatingAccount(true)}
                      className="font-medium underline hover:no-underline transition-all duration-300"
                      style={{ color: "#5D4037" }}
                    >
                      Create one here
                    </button>
                  </>
                )}
              </p>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap");

        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
          opacity: 0;
          transform: translateY(30px);
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
        }

        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-5px);
          }
          75% {
            transform: translateX(5px);
          }
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        /* Enhanced focus states */
        input:focus {
          transform: translateY(-2px);
        }

        /* Button hover effects */
        .group:hover {
          transform: scale(1.05) translateY(-2px);
        }
      `}</style>
    </div>
  );
};

export default Login;

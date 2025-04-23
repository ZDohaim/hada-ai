import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { auth, googleProvider, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore"; // Firestore functions

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
      navigate("/create-prompt");
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
      navigate("/create-prompt");
    } catch (err) {
      setError("Failed to create account. Please try again.");
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Log successful authentication
      console.log("Google Authentication successful", user);

      try {
        // Create the user document reference
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
        navigate("/create-prompt");
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
    <div className="login-page min-h-screen flex items-center justify-center bg-lightYellow">
      <form
        onSubmit={isCreatingAccount ? handleCreateAccount : handleLogin}
        className="p-8 rounded-lg shadow-lg"
        style={{ backgroundColor: "#FFE0B2", color: "#3E2723" }}
      >
        <h1 className="text-2xl font-bold mb-4 text-center">
          {isCreatingAccount ? "Create Account" : "Login"}
        </h1>

        {error && <p className="text-red-600 mb-4">{error}</p>}

        {/* Google Sign-in/Sign-up Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full py-3 rounded font-medium mb-4 bg-white border border-mediumBrown flex items-center justify-center"
        >
          <img
            src="https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/dark/google-color.png"
            alt="Google Logo"
            className="w-5 h-5 mr-2"
          />
          {isCreatingAccount ? "Sign up with Google" : "Sign in with Google"}
        </button>

        {/* OR Separator (Updated to match the login form border color) */}
        <div className="or-separator my-4 flex items-center">
          <div className="flex-1 border-t border-mediumBrown"></div>
          <span className="px-2 text-mediumBrown">or</span>
          <div className="flex-1 border-t border-mediumBrown"></div>
        </div>

        {/* Registration Fields */}
        {isCreatingAccount && (
          <>
            <div className="mb-4">
              <label className="block text-sm mb-2">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full p-3 rounded bg-softYellow text-darkBrown border border-mediumBrown"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm mb-2">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full p-3 rounded bg-softYellow text-darkBrown border border-mediumBrown"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm mb-2">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full p-3 rounded bg-softYellow text-darkBrown border border-mediumBrown"
                required
              />
            </div>
          </>
        )}

        {/* Email & Password Fields */}
        <div className="mb-4">
          <label className="block text-sm mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded bg-softYellow text-darkBrown border border-mediumBrown"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded bg-softYellow text-darkBrown border border-mediumBrown"
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3 rounded font-medium"
          style={{
            backgroundColor: "#8D6E63",
            color: "#FFF3E0",
            transition: "background-color 0.3s ease",
          }}
        >
          {isCreatingAccount ? "Create Account" : "Login"}
        </button>

        {/* Toggle between Login & Signup */}
        <p className="text-center mt-4">
          {isCreatingAccount ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setIsCreatingAccount(false)}
                className="text-mediumBrown underline"
              >
                Log in here
              </button>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => setIsCreatingAccount(true)}
                className="text-mediumBrown underline"
              >
                Create one here
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  );
};

export default Login;

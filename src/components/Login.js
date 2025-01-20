import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { auth } from "../firebase";
import { getFirestore, doc, setDoc } from "firebase/firestore"; // Import Firestore functions

const db = getFirestore(); // Initialize Firestore

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState(""); // New
  const [lastName, setLastName] = useState(""); // New
  const [dob, setDob] = useState(""); // New
  const [error, setError] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const navigate = useNavigate(); // Initialize useNavigate

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Login successful");
      setError("");
      navigate("/create-prompt"); // Redirect to GiftGenerator page
    } catch (err) {
      setError("Failed to login. Check your credentials.");
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();

    // Simple client-side validation
    if (!email || !password || !firstName || !lastName || !dob) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Save additional user information to Firestore
      await setDoc(doc(db, "users", user.uid), {
        firstName,
        lastName,
        email,
        dob,
        uid: user.uid,
      });

      console.log("Account created successfully");
      setError("");
      navigate("/create-prompt"); // Redirect to GiftGenerator page
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already in use. Please log in.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address. Please check your input.");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Please use at least 6 characters.");
      } else {
        setError("Failed to create account. Please try again.");
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
        <h1 className="text-2xl font-bold mb-4">
          {isCreatingAccount ? "Create Account" : "Login"}
        </h1>
        {error && <p className="text-red-600 mb-4">{error}</p>}
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

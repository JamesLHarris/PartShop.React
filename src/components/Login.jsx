import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import loginService from "../service/loginService";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleLogin = () => {
    const payload = { email, password };

    loginService.userLogin(payload).then((response) => {
      const userId = response.item;
      console.log("RESPONSE", response.item);
      localStorage.setItem("userId", userId);
      localStorage.setItem("isLoggedIn", "true");
      navigate("/admin");
    });
  };

  return (
    <div>
      <h2>Login</h2>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        placeholder="Password"
      />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}

export default Login;

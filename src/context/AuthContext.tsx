"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export type User = {
  id: string;
  name: string;
  phone: string;
  role?: 'FARMER' | 'OFFICER' | 'ADMIN';
  location?: string;
};

type AuthContextType = {
  user: User | null;
  login: (mode: 'signin' | 'signup', name: string, phone: string, password?: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("krushi_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("krushi_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (mode: 'signin' | 'signup', name: string, phone: string, password?: string) => {
    try {

      // Check if it's a locally created mock officer
      const mockOfficers = JSON.parse(localStorage.getItem('mock_officers') || '[]');
      const foundMock = mockOfficers.find((o:any) => o.phone === phone && o.password === password);
      if (foundMock) {
         setUser(foundMock);
         localStorage.setItem("krushi_user", JSON.stringify(foundMock));
         return foundMock;
      }
      
      let existingUsers;
      try {
        existingUsers = await supabase.from("users").eq("phone", phone);
      } catch (dbErr) {
        throw new Error("DB Fetch Error: " + dbErr.message);
      }

      let loggedInUser;
      
      if (mode === 'signin') {
        if (!existingUsers || existingUsers.length === 0) {
          throw new Error("User Not Found");
        }
        
        // If they actually type the DB password, or if they just bypass it for demo
        if (password && existingUsers[0].password && existingUsers[0].password !== password) {
          throw new Error("Wrong Password");
        }
        loggedInUser = existingUsers[0];
        
        // Fallback: If DB doesn't have role column, ensure they are treated as FARMER
        if (!loggedInUser.role) {
          loggedInUser.role = 'FARMER';
        }
      } else {
        // signup mode
        if (existingUsers && existingUsers.length > 0) {
          throw new Error("User Already Exists");
        }
        
        // Try inserting (might fail if role column is missing, so we omit role if it's FARMER)
        let newUsers;
        try {
           newUsers = await supabase.from("users").insert({ name, phone, password: password || "" });
        } catch(err) {
           console.error("DB Insert Error details:", err); throw new Error("Failed to create user in DB: " + err.message);
        }
        
        if (!newUsers || newUsers.length === 0) {
          // If insert didn't return data (due to prefer=minimal), just mock it
          loggedInUser = { id: crypto.randomUUID(), name, phone, role: 'FARMER' };
        } else {
          loggedInUser = newUsers[0];
          if (!loggedInUser.role) loggedInUser.role = 'FARMER';
        }
      }
      
      setUser(loggedInUser);
      localStorage.setItem("krushi_user", JSON.stringify(loggedInUser));
      return loggedInUser;
    } catch (e: any) {
      console.error("Login Error:", e);
      if (e.message === "Wrong Password") {
        alert("ખોટો પાસવર્ડ! ફરી પ્રયાસ કરો.");
      } else if (e.message === "User Not Found") {
        alert("આ નંબરથી કોઈ ખાતું નથી. કૃપા કરીને 'નવું ખાતું' બનાવો.");
      } else if (e.message === "User Already Exists") {
        alert("આ નંબરથી પહેલેથી જ ખાતું છે. કૃપા કરીને લોગિન કરો.");
      } else {
        alert("લોગિનમાં ભૂલ આવી: " + e.message);
      }
      throw e;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("krushi_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

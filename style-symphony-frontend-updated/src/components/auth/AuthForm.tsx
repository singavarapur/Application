"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import axios from "axios";

interface AuthFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (
    name: string,
    email: string,
    password: string,
    role: "customer" | "designer"
  ) => Promise<void>;
}

const AuthForm = ({ onLogin, onRegister }: AuthFormProps) => {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"customer" | "designer">("customer");
  const { toast } = useToast();
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    try {
      await onLogin(email, password);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Login failed",
        variant: "destructive",
      });
    }
  };

 const handleRegister = async (
    name: string,
    email: string,
    password: string,
    role: "customer" | "designer"
  ) => {
    const [first_name, ...rest] = name.split(" ");
    const last_name = rest.join(" ") || "N/A";

    const response = await axios.post("http://localhost:8000/api/auth/register", {
      email,
      password,
      first_name,
      last_name,
      role: role.charAt(0).toUpperCase() + role.slice(1), // convert to "Customer"/"Designer"
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (activeTab === "login") {
      if (!email || !password) {
        setError("Please fill in all fields");
        return;
      }
      try {
        await onLogin(email, password);
      } catch (error: any) {
        setError(error.message || "Login failed");
      }
    } else {
      if (!name) {
        setError("Name is required");
        return;
      }
      if (!role) {
        setError("Please select a role");
        return;
      }
      try {
        await onRegister(
          name,
          email,
          password,
          role as "customer" | "designer"
        );
      } catch (error: any) {
        console.log("h", error);
        setError(error.message || "Registration failed");
        console.log(error);
      }

      
    }
  };
  return (

    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-fashion-purple text-center text-2xl font-serif">
          Style Symphony
        </CardTitle>
        <CardDescription className="text-center">
          Login or create an account to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="login"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-red-500">{error}</p>}
              <Button
                type="submit"
                className="w-full bg-fashion-purple hover:bg-fashion-purple-dark"
              >
                Login
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRegister(name, email, password, role);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-email">Email</Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-password">Password</Label>
                <Input
                  id="reg-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>I am a:</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={role === "customer" ? "default" : "outline"}
                    className={role === "customer" ? "bg-fashion-purple" : ""}
                    onClick={() => setRole("customer")}
                  >
                    Customer
                  </Button>
                  <Button
                    type="button"
                    variant={role === "designer" ? "default" : "outline"}
                    className={role === "designer" ? "bg-fashion-purple" : ""}
                    onClick={() => setRole("designer")}
                  >
                    Designer
                  </Button>
                </div>
              </div>
              {error && <p className="text-red-500">{error}</p>}
              <Button
                type="submit"
                className="w-full bg-fashion-purple hover:bg-fashion-purple-dark"
              >
                Register
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AuthForm;

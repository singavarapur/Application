import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface User {
  email: string;
  first_name: string;
  last_name: string;
  role: "Customer" | "Designer" | string;
  profileImage?: string;
}

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

const capitalizeRole = (role: string): "Customer" | "Designer" => {
  return role.toLowerCase() === "customer" ? "Customer" : "Designer";
};

const Navbar = ({ user, onLogout }: NavbarProps) => {
  const getInitials = (first: string, last?: string) => {
    return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase();
  };

  const normalizedRole = user ? capitalizeRole(user.role) : null;

  return (
    <nav className="border-b border-gray-200 py-4 px-6 bg-white">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-serif text-fashion-purple">
          StyleVerse
        </Link>

        <div className="flex items-center gap-6">
          {user ? (
            <>
              <div className="hidden md:flex gap-4">
                <Link
                  to="/"
                  className="text-gray-700 hover:text-fashion-purple transition-colors"
                >
                  Home
                </Link>
                {normalizedRole === "Customer" ? (
                  <>
                    <Link
                      to="/my-requests"
                      className="text-gray-700 hover:text-fashion-purple transition-colors"
                    >
                      My Requests
                    </Link>
                    <Link
                      to="/new-request"
                      className="text-gray-700 hover:text-fashion-purple transition-colors"
                    >
                      New Request
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/marketplace"
                      className="text-gray-700 hover:text-fashion-purple transition-colors"
                    >
                      Designer Marketplace
                    </Link>
                    <Link
                      to="/manage-orders"
                      className="text-gray-700 hover:text-fashion-purple transition-colors"
                    >
                      Manage Orders
                    </Link>
                  </>
                )}
                <Link
                  to="/messages"
                  className="text-gray-700 hover:text-fashion-purple transition-colors"
                >
                  Messages
                </Link>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                  >
                    <Avatar>
                      <AvatarImage
                        src={user.profileImage}
                        alt={`${user.first_name} ${user.last_name}`}
                      />
                      <AvatarFallback>
                        {getInitials(user.first_name, user.last_name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer w-full">
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      to={
                        normalizedRole === "Customer"
                          ? "/my-requests"
                          : "/marketplace"
                      }
                      className="cursor-pointer w-full"
                    >
                      {normalizedRole === "Customer"
                        ? "My Requests"
                        : "Marketplace"}
                    </Link>
                  </DropdownMenuItem>
                  {normalizedRole === "Designer" && (
                    <DropdownMenuItem asChild>
                      <Link
                        to="/manage-orders"
                        className="cursor-pointer w-full"
                      >
                        Manage Orders
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/messages" className="cursor-pointer w-full">
                      Messages
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="cursor-pointer"
                  >
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/auth">
              <Button className="bg-fashion-purple hover:bg-fashion-purple-dark">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

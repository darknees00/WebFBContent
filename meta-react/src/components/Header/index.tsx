import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
// import { ChevronDown } from "lucide-react";

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <header className="bg-white border-b px-6 py-3 flex items-center fixed top-0 left-0 w-full z-50 shadow-md">
      <div className="flex items-center">
        <img className="h-10" src="../imgs/logo.png" alt="Logo" />
      </div>
    </header>
  );
};

export default Header;

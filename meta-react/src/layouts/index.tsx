import React from "react";
import Header from "../components/Header";


const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col pt-14">
      <Header />
      <main>{children}</main>
    </div>
  );
};

export default Layout;
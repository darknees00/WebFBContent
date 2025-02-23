import React from 'react';

const AboutPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow p-8">
        <h2 className="text-2xl font-semibold mb-4">This is the Aboutpage</h2>
        <p className="text-lg text-gray-700">
          Welcome to the Aboutpage of my website. This is a simple React app
          styled with Tailwind CSS.
        </p>
      </main>
    </div>
  );
};

export default AboutPage;

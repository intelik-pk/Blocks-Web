import React from "react";

const Loader = () => {
  return (
    <div className="flex justify-center items-end w-[300px] h-[100px]">
      <div className="wave-bar animate-wave1"></div>
      <div className="wave-bar animate-wave2"></div>
      <div className="wave-bar animate-wave3"></div>
      <div className="wave-bar animate-wave4"></div>
    </div>
  );
};

export default Loader;

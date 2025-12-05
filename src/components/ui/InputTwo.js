import React, { useState } from "react";

const InputTwo = ({ className = "", style = {}, onFocus, onBlur, onMouseEnter, onMouseLeave, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const baseStyle = {
    backgroundColor: '#e0e0e0',
    borderRadius: '15px',
    color: '#4d4d4d',
    fontSize: '16px',
    padding: '8px 48px',
    border: '2px solid rgb(206, 206, 206)',
    width: '100%',
    transition: 'all 0.2s ease-in-out',
    ...style
  };

  const getBoxShadow = () => {
    if (isFocused || isHovered) {
      return 'inset 2px 2px 5px #bcbcbc, inset -2px -2px 5px #ffffff, 2px 2px 5px #bcbcbc, -2px -2px 5px #ffffff';
    }
    return 'inset 4px 4px 10px #bcbcbc, inset -4px -4px 10px #ffffff';
  };

  const inputStyle = {
    ...baseStyle,
    boxShadow: getBoxShadow(),
    outline: 'none'
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const handleMouseEnter = (e) => {
    setIsHovered(true);
    if (onMouseEnter) onMouseEnter(e);
  };

  const handleMouseLeave = (e) => {
    setIsHovered(false);
    if (onMouseLeave) onMouseLeave(e);
  };

  return (
    <input 
      className={className}
      style={inputStyle}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props} 
    />
  );
};

export default InputTwo;

import { useContext } from 'react';
import { ThemeContext } from '../three/ThemeContext'; // Adjust path if necessary

const getThemedIcon = (iconName, svg = true) => {
  const { isDarkMode } = useContext(ThemeContext); // Get dark mode from context
  if (!svg) {
    return `assets/icons/${iconName}${isDarkMode ? '-light' : ''}.webp`;
  } else {
    return `assets/icons/${iconName}${isDarkMode ? '-light' : ''}.svg`;
  }
};

export default getThemedIcon;

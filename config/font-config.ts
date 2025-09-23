import { useFonts } from 'expo-font';
import { Text, TextInput } from 'react-native';

export const useAppFonts = () => {
  const [fontsLoaded, fontError] = useFonts({
    // Poppins fonts
    'Poppins-Regular': require('../assets/fonts/Poppins/Poppins-Regular.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins/Poppins-Bold.ttf'),
    'Poppins-Light': require('../assets/fonts/Poppins/Poppins-Light.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins/Poppins-SemiBold.ttf'),
    
    // Lato fonts
    'Lato-Regular': require('../assets/fonts/Lato/Lato-Regular.ttf'),
    'Lato-Bold': require('../assets/fonts/Lato/Lato-Bold.ttf'),
    'Lato-Light': require('../assets/fonts/Lato/Lato-Light.ttf'),
    
  });

  return { fontsLoaded, fontError };
};

// Set global font family for all Text components
export const setGlobalFont = (fontFamily: string = 'Poppins-Regular') => {
  // Type assertion to allow setting defaultProps
  const TextComponent = Text as any;
  const TextInputComponent = TextInput as any;

  // Set default props for Text component
  const defaultTextProps = TextComponent.defaultProps || {};
  TextComponent.defaultProps = {
    ...defaultTextProps,
    style: {
      fontFamily,
      ...(defaultTextProps.style || {}),
    },
  };

  // Set default props for TextInput component
  const defaultTextInputProps = TextInputComponent.defaultProps || {};
  TextInputComponent.defaultProps = {
    ...defaultTextInputProps,
    style: {
      fontFamily,
      ...(defaultTextInputProps.style || {}),
    },
  };
};

export const FONT_FAMILIES = {
  // Poppins
  poppins: {
    regular: 'Poppins-Regular',
    bold: 'Poppins-Bold',
    light: 'Poppins-Light',
    semibold: 'Poppins-SemiBold',
  },
  // Lato
  lato: {
    regular: 'Lato-Regular',
    bold: 'Lato-Bold',
    light: 'Lato-Light',
  },
};
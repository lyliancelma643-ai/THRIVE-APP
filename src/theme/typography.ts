import { Platform, TextStyle } from 'react-native';

export const typography = {
  // En React Native, ne pas spécifier de fontFamily utilise SF Pro sur iOS et Roboto sur Android par défaut.
  h1: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#FFFFFF',
  } as TextStyle,
  h2: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  } as TextStyle,
  h3: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  } as TextStyle,
  body: {
    fontSize: 17,
    fontWeight: 'normal',
    color: '#FFFFFF',
  } as TextStyle,
  bodySecondary: {
    fontSize: 17,
    fontWeight: 'normal',
    color: 'rgba(235, 235, 245, 0.6)',
  } as TextStyle,
  caption: {
    fontSize: 13,
    fontWeight: 'normal',
    color: 'rgba(235, 235, 245, 0.6)',
  } as TextStyle,
  button: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  } as TextStyle,
};

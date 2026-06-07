import React from 'react';
import { Pressable, Text, View, StyleSheet, PressableProps } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger_outline' | 'text_link' | 'icon';

interface ButtonProps extends PressableProps {
  label?: string;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ 
  label, 
  variant = 'primary', 
  icon: Icon, 
  size = 'md',
  className,
  ...props 
}: ButtonProps) {
  
  const getContainerStyles = (pressed: boolean) => {
    const base = 'flex-row items-center justify-center rounded-full ';
    
    // Scale on press
    const transform = pressed ? 'scale-95 opacity-90' : 'scale-100 opacity-100';
    
    // Size variants
    let sizeStyle = 'px-6 h-11'; // Default md
    if (size === 'sm') sizeStyle = 'px-4 h-10';
    if (size === 'lg') sizeStyle = 'px-8 h-14';
    if (variant === 'icon') sizeStyle = 'w-11 h-11';
    if (variant === 'text_link') sizeStyle = 'px-0 h-auto';

    // Color variants
    let colorStyle = '';
    if (variant === 'primary') colorStyle = 'bg-primary-accent shadow-sm';
    if (variant === 'secondary') colorStyle = 'bg-transparent border border-primary-accent';
    if (variant === 'ghost') colorStyle = 'bg-transparent border border-transparent hover:bg-surface-elevated';
    if (variant === 'danger_outline') colorStyle = 'bg-transparent border border-danger';
    if (variant === 'icon') colorStyle = 'bg-surface-elevated hover:bg-primary-accent';
    
    return `${base} ${sizeStyle} ${colorStyle} ${transform} ${className || ''}`;
  };

  const getLabelStyles = () => {
    const base = 'font-semibold text-center ';
    
    let textStyle = '';
    if (size === 'sm') textStyle = 'text-sm';
    if (size === 'md') textStyle = 'text-base';
    if (size === 'lg') textStyle = 'text-lg';

    let colorStyle = '';
    if (variant === 'primary') colorStyle = 'text-primary-background';
    if (variant === 'secondary') colorStyle = 'text-white';
    if (variant === 'ghost' || variant === 'text_link') colorStyle = 'text-primary-accent';
    if (variant === 'danger_outline') colorStyle = 'text-danger';

    return `${base} ${textStyle} ${colorStyle}`;
  };

  const getIconColor = () => {
    if (variant === 'primary') return '#1b263b';
    if (variant === 'danger_outline') return '#ff4b4b';
    return '#c5a059'; // primary.accent
  };

  return (
    <Pressable 
      {...props} 
      className={({ pressed }) => getContainerStyles(pressed)}
    >
      {({ pressed }) => (
        <>
          {Icon && <Icon color={getIconColor()} size={size === 'sm' ? 18 : 20} className={label ? "mr-2" : ""} />}
          {label && <Text className={getLabelStyles()}>{label}</Text>}
        </>
      )}
    </Pressable>
  );
}

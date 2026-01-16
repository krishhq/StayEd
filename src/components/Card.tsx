import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, StyleProp } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { BorderRadius, Spacing, Shadows } from '../constants/DesignSystem';

interface CardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    onPress?: () => void;
    variant?: 'elevated' | 'outlined' | 'flat';
}


export default function Card({ children, style, onPress, variant = 'elevated' }: CardProps) {
    const { colors, theme } = useTheme();

    const cardStyle = [
        styles.base,
        {
            backgroundColor: colors.card,
            padding: Spacing.md,
            borderRadius: BorderRadius.lg,
        },
        variant === 'elevated' && (theme === 'light' ? Shadows.md : { borderWidth: 1, borderColor: colors.border }),
        variant === 'outlined' && { borderWidth: 1, borderColor: colors.border },
        variant === 'flat' && { backgroundColor: theme === 'light' ? colors.background : colors.border },
        style,
    ];

    if (onPress) {
        return (
            <TouchableOpacity style={cardStyle} onPress={onPress}>
                {children}
            </TouchableOpacity>
        );
    }

    return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
    base: {
        overflow: 'hidden',
    },
});

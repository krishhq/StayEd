import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Typography, Spacing, BorderRadius } from '../constants/DesignSystem';

interface ScreenHeaderProps {
    title: string;
    showLogo?: boolean;
    onProfilePress?: () => void;
    onBackPress?: () => void;
    rightElement?: React.ReactNode;
}

export default function ScreenHeader({ title, showLogo = true, onProfilePress, onBackPress, rightElement }: ScreenHeaderProps) {

    const { colors, theme, toggleTheme } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.content}>
                <View style={styles.leftSection}>
                    {onBackPress && (
                        <TouchableOpacity onPress={onBackPress} style={[styles.iconBtn, { marginRight: Spacing.sm }]}>
                            <Text style={styles.icon}>⬅️</Text>
                        </TouchableOpacity>
                    )}
                    {showLogo && !onBackPress && (
                        <Image
                            source={require('../../assets/logo.jpg')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    )}
                    <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                        {title}
                    </Text>
                </View>


                <View style={styles.rightSection}>
                    {rightElement}
                    <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn}>
                        <Text style={styles.icon}>{theme === 'light' ? '🌙' : '☀️'}</Text>
                    </TouchableOpacity>
                    {onProfilePress && (
                        <TouchableOpacity onPress={onProfilePress} style={[styles.iconBtn, { backgroundColor: colors.primary + '20' }]}>
                            <Text style={[styles.icon, { color: colors.primary }]}>👤</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingTop: Platform.OS === 'ios' ? 0 : 10,
        borderBottomWidth: 1,
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
        height: 60,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    logo: {
        width: 36,
        height: 36,
        marginRight: Spacing.sm,
        borderRadius: BorderRadius.sm,
    },
    title: {
        fontSize: Typography.size.xl,
        fontWeight: Typography.weight.bold,
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    iconBtn: {
        padding: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: 'rgba(150,150,150,0.1)',
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        fontSize: 20,
    },
});

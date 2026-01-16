import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface LoadingScreenProps {
    message?: string;
}

export default function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
    const { colors } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Image
                source={require('../../assets/logo.jpg')}
                style={styles.logo}
                resizeMode="contain"
            />
            <ActivityIndicator size="large" color={colors.text} style={{ marginTop: 30 }} />
            <Text style={[styles.message, { color: colors.subText }]}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    logo: {
        width: 120,
        height: 120,
        borderRadius: 24,
    },
    message: {
        marginTop: 15,
        fontSize: 16,
        fontWeight: '600',
    },
});

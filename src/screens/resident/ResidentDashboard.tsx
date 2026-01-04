import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function ResidentDashboard({ navigation }: any) {
    const { signOut } = useAuth();
    const { colors, theme, toggleTheme } = useTheme();

    const dynamicStyles = {
        container: { backgroundColor: colors.background },
        text: { color: colors.text },
        subText: { color: colors.subText },
        card: { backgroundColor: colors.card },
        cardText: { color: colors.text },
    };

    return (
        <ScrollView style={[styles.container, dynamicStyles.container]}>
            {/* Header Section */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={[styles.welcome, dynamicStyles.text]}>Welcome Resident!</Text>
                        <Text style={[styles.subtext, dynamicStyles.subText]}>What would you like to do today?</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn}>
                            <Text style={{ fontSize: 22 }}>{theme === 'light' ? '🌙' : '☀️'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profileBtn}>
                            <Text style={{ fontSize: 24 }}>👤</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={styles.grid}>
                <TouchableOpacity style={[styles.card, dynamicStyles.card]} onPress={() => navigation.navigate('Attendance')}>
                    <Text style={styles.cardIcon}>📷</Text>
                    <Text style={[styles.cardText, dynamicStyles.cardText]}>Log Entry/Exit</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.card, dynamicStyles.card]} onPress={() => navigation.navigate('Complaints')}>
                    <Text style={styles.cardIcon}>🔧</Text>
                    <Text style={[styles.cardText, dynamicStyles.cardText]}>Raise Complaint</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.card, dynamicStyles.card]} onPress={() => navigation.navigate('Forum')}>
                    <Text style={styles.cardIcon}>💬</Text>
                    <Text style={[styles.cardText, dynamicStyles.cardText]}>Community Forum</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.card, dynamicStyles.card]} onPress={() => navigation.navigate('Leave')}>
                    <Text style={styles.cardIcon}>📅</Text>
                    <Text style={[styles.cardText, dynamicStyles.cardText]}>Apply Leave</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.card, dynamicStyles.card]} onPress={() => navigation.navigate('Mess')}>
                    <Text style={styles.cardIcon}>🍛</Text>
                    <Text style={[styles.cardText, dynamicStyles.cardText]}>Mess Menu</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    header: {
        marginTop: 40,
        marginBottom: 30,
    },
    welcome: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    subtext: {
        fontSize: 16,
        marginTop: 5,
    },
    profileBtn: {
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 25,
        elevation: 2,
    },
    iconBtn: {
        backgroundColor: 'rgba(150,150,150,0.2)',
        padding: 10,
        borderRadius: 25,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    card: {
        width: '48%',
        padding: 20,
        borderRadius: 15,
        marginBottom: 15,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        height: 130,
    },
    cardIcon: {
        fontSize: 32,
        marginBottom: 10,
    },
    cardText: {
        fontWeight: '600',
        textAlign: 'center',
    },
    logoutBtn: {
        marginTop: 'auto',
        backgroundColor: '#ff4444',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20,
    },
    logoutText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});

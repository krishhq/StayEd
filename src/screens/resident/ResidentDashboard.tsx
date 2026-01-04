import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function ResidentDashboard({ navigation }: any) {
    const { signOut, user } = useAuth();

    return (
        <View style={styles.container}>
            {/* Header Section */}
            <View style={styles.header}>
                <Text style={styles.welcome}>Welcome Resident!</Text>
                <Text style={styles.subtext}>What would you like to do today?</Text>
            </View>

            <View style={styles.grid}>
                <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Attendance')}>
                    <Text style={styles.cardIcon}>📷</Text>
                    <Text style={styles.cardText}>Log Entry/Exit</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Complaints')}>
                    <Text style={styles.cardIcon}>🔧</Text>
                    <Text style={styles.cardText}>Raise Complaint</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Forum')}>
                    <Text style={styles.cardIcon}>💬</Text>
                    <Text style={styles.cardText}>Community Forum</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Leave')}>
                    <Text style={styles.cardIcon}>📅</Text>
                    <Text style={styles.cardText}>Apply Leave</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.card, styles.disabledCard]} onPress={() => console.log('Mess Menu')}>
                    <Text style={styles.cardIcon}>🍛</Text>
                    <Text style={styles.cardText}>Mess Menu (Coming Soon)</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f8f9fa',
    },
    header: {
        marginTop: 40,
        marginBottom: 30,
    },
    welcome: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
    },
    subtext: {
        fontSize: 16,
        color: '#666',
        marginTop: 5,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    card: {
        width: '48%',
        backgroundColor: 'white',
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
    disabledCard: {
        opacity: 0.6,
        backgroundColor: '#f1f1f1'
    },
    cardIcon: {
        fontSize: 32,
        marginBottom: 10,
    },
    cardText: {
        fontWeight: '600',
        textAlign: 'center',
        color: '#333',
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

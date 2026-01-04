import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function ResidentDashboard() {
    const { signOut } = useAuth();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Resident Dashboard</Text>
            <Button title="Logout" onPress={signOut} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        marginBottom: 20,
    },
});

import React from 'react';
import { View, Text, StyleSheet, Button, Clipboard } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function PendingScreen() {
    const { user, signOut } = useAuth();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Access Pending</Text>
            <Text style={styles.message}>
                Your account has been created but not yet assigned a role.
            </Text>
            <Text style={styles.info}>UID: {user?.uid}</Text>
            <View style={styles.buttonContainer}>
                <Button title="Copy UID" onPress={() => Clipboard.setString(user?.uid || '')} />
            </View>
            <Text style={styles.instruction}>
                Please ask an Administrator to register you.
                If you are the Administrator, manually create a document in 'users' collection with this UID and field 'role' = 'admin'.
            </Text>
            <Button title="Logout" onPress={signOut} color="red" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    info: {
        marginTop: 10,
        fontWeight: 'bold',
        marginBottom: 10,
        backgroundColor: '#eee',
        padding: 10,
    },
    buttonContainer: {
        marginBottom: 20,
    },
    instruction: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
        fontStyle: 'italic',
    },
});

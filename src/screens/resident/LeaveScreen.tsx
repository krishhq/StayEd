import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView } from 'react-native';
import { db } from '../../config/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

export default function LeaveScreen() {
    const { user } = useAuth();
    const [reason, setReason] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);

    const submitLeave = async () => {
        if (!reason || !startDate || !endDate) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            if (user) {
                await addDoc(collection(db, 'leaves'), {
                    userId: user.uid,
                    reason,
                    startDate,
                    endDate,
                    status: 'pending_guardian', // Initial status
                    createdAt: serverTimestamp(),
                });
                Alert.alert('Success', 'Leave Application Submitted!');
                setReason('');
                setStartDate('');
                setEndDate('');
            } else {
                console.log({ reason, startDate, endDate });
                Alert.alert('Dev Mode', 'Leave logged to console');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.header}>Apply for Leave</Text>

            <Text style={styles.label}>Reason for Leave</Text>
            <TextInput
                style={styles.input}
                value={reason}
                onChangeText={setReason}
                placeholder="e.g. Going home for festival"
            />

            <Text style={styles.label}>Start Date (DD/MM/YYYY)</Text>
            <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="25/12/2026"
            />

            <Text style={styles.label}>End Date (DD/MM/YYYY)</Text>
            <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="01/01/2027"
            />

            <View style={styles.btnContainer}>
                <Button title={loading ? "Submitting..." : "Submit Application"} onPress={submitLeave} disabled={loading} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    label: {
        fontWeight: 'bold',
        marginTop: 15,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 5,
        marginTop: 5,
        backgroundColor: 'white',
    },
    btnContainer: {
        marginTop: 30,
    }
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert, ScrollView } from 'react-native';
import { db } from '../../config/firebaseConfig';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';

export default function RegisterResidentScreen() {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [room, setRoom] = useState('');

    // New Fields
    const [guardianName, setGuardianName] = useState('');
    const [guardianPhone, setGuardianPhone] = useState('');
    const [permanentAddress, setPermanentAddress] = useState('');
    const [aadharCard, setAadharCard] = useState('');

    const handleRegister = async () => {
        if (!name || !phone || !guardianName || !guardianPhone || !room) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        try {
            await addDoc(collection(db, 'residents_data'), {
                name,
                phone,
                email,
                room,
                guardianName,
                guardianPhone,
                permanentAddress,
                aadharCard,
                status: 'active',
                createdAt: new Date().toISOString()
            });
            Alert.alert('Success', 'Resident Registered Successfully');
            // Reset Form
            setName('');
            setPhone('');
            setEmail('');
            setRoom('');
            setGuardianName('');
            setGuardianPhone('');
            setPermanentAddress('');
            setAadharCard('');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.header}>Add New Resident</Text>

            <Text style={styles.sectionHeader}>Resident Details</Text>

            <Text style={styles.label}>Full Name*</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Student Name" />

            <Text style={styles.label}>Phone Number*</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91..." />

            <Text style={styles.label}>Email (Optional)</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="student@example.com" />

            <Text style={styles.label}>Room Number*</Text>
            <TextInput style={styles.input} value={room} onChangeText={setRoom} placeholder="101" />

            <Text style={styles.label}>Aadhar Card Number</Text>
            <TextInput style={styles.input} value={aadharCard} onChangeText={setAadharCard} keyboardType="number-pad" placeholder="12 Digit UID" />

            <Text style={styles.sectionHeader}>Guardian Details</Text>

            <Text style={styles.label}>Guardian Name*</Text>
            <TextInput style={styles.input} value={guardianName} onChangeText={setGuardianName} placeholder="Parent/Guardian Name" />

            <Text style={styles.label}>Guardian Phone*</Text>
            <TextInput style={styles.input} value={guardianPhone} onChangeText={setGuardianPhone} keyboardType="phone-pad" placeholder="+91..." />

            <Text style={styles.label}>Permanent Address</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                value={permanentAddress}
                onChangeText={setPermanentAddress}
                placeholder="Full Address..."
                multiline
                numberOfLines={3}
            />

            <View style={styles.btnContainer}>
                <Button title="Register Resident" onPress={handleRegister} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
        textAlign: 'center',
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 15,
        marginBottom: 10,
        color: '#007AFF',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        paddingBottom: 5,
    },
    label: {
        fontWeight: '600',
        marginTop: 10,
        color: '#444',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 5,
        marginTop: 5,
        backgroundColor: 'white',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    btnContainer: {
        marginTop: 30,
        marginBottom: 20,
    }
});

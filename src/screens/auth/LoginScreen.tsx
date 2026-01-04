import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { signInWithPhoneNumber, RecaptchaVerifier, PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../../config/firebaseConfig';
import { FirebaseRecaptchaVerifierModal, FirebaseRecaptchaBanner } from 'expo-firebase-recaptcha';

// Note: For Expo Go, we need the Firebase Recaptcha Verifier Modal
// Adding strictly necessary imports and setup

import { useAuth } from '../../context/AuthContext';

export default function LoginScreen({ navigation }: any) {
    const { simulateLogin } = useAuth();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationId, setVerificationId] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const recaptchaVerifier = React.useRef<any>(null);

    const sendVerification = async () => {
        try {
            const phoneProvider = new PhoneAuthProvider(auth);
            // @ts-ignore
            const verificationId = await phoneProvider.verifyPhoneNumber(
                phoneNumber,
                recaptchaVerifier.current
            );
            setVerificationId(verificationId);
            Alert.alert('Verification Sent', 'Please check your SMS for the code.');
        } catch (err: any) {
            console.error(err);
            Alert.alert('Error', err.message);
        }
    };

    const confirmCode = async () => {
        try {
            const credential = PhoneAuthProvider.credential(
                verificationId,
                verificationCode
            );
            await signInWithCredential(auth, credential);
            // Success is handled by AuthContext onAuthStateChanged
        } catch (err: any) {
            console.error(err);
            Alert.alert('Error', err.message);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Hostel Login</Text>
            <View style={styles.inputContainer}>
                <TextInput
                    placeholder="+91 9876543210"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    style={styles.input}
                />
                <Button title="Send OTP" onPress={sendVerification} />
            </View>

            {verificationId ? (
                <View style={styles.inputContainer}>
                    <TextInput
                        placeholder="123456"
                        value={verificationCode}
                        onChangeText={setVerificationCode}
                        keyboardType="number-pad"
                        style={styles.input}
                    />
                    <Button title="Login" onPress={confirmCode} />
                </View>
            ) : null}

            <FirebaseRecaptchaVerifierModal
                ref={recaptchaVerifier}
                firebaseConfig={auth.app.options}
            // attemptInvisibleVerification={true} // Optional
            />

            {/* DEV ONLY: Debug Buttons */}
            <View style={{ marginTop: 40, borderTopWidth: 1, paddingTop: 20 }}>
                <Text style={{ textAlign: 'center', marginBottom: 10, color: 'gray' }}>Development Mode</Text>
                <Button title="Simulate Resident Login" onPress={() => simulateLogin('resident')} color="green" />
                <View style={{ height: 10 }} />
                <Button title="Simulate Admin Login" onPress={() => simulateLogin('admin')} color="orange" />
                <View style={{ height: 10 }} />
                <Button title="Simulate Guardian Login" onPress={() => simulateLogin('guardian')} color="purple" />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginBottom: 10,
        borderRadius: 5,
    }
});

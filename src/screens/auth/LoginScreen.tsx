import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import { auth } from '../../config/firebaseConfig';
import { FirebaseRecaptchaVerifierModal, FirebaseRecaptchaBanner } from 'expo-firebase-recaptcha';

// Note: For Expo Go, we need the Firebase Recaptcha Verifier Modal
// Adding strictly necessary imports and setup

export default function LoginScreen({ navigation }: any) {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationId, setVerificationId] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const recaptchaVerifier = React.useRef(null);

    // Simulation Mode state (to bypass Real Auth for demo if needed)
    // const [isSimulated, setIsSimulated] = useState(false);

    // TODO: Add your firebaseConfig here implicitly or pass it to Recaptcha

    const sendVerification = async () => {
        try {
            // Real flow
            // const phoneProvider = new PhoneAuthProvider(auth);
            // const verificationId = await phoneProvider.verifyPhoneNumber(
            //   phoneNumber,
            //   recaptchaVerifier.current
            // );
            // setVerificationId(verificationId);
            Alert.alert('Verification Sent', 'Demo: OTP Sent (Simulated)');
            setVerificationId('demo-verification-id'); // Simulating
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
    };

    const confirmCode = async () => {
        try {
            // Real flow
            // const credential = PhoneAuthProvider.credential(
            //   verificationId,
            //   verificationCode
            // );
            // await signInWithCredential(auth, credential);
            Alert.alert('Success', 'Login Succeeded (Simulated)');
            // In a real app, the onAuthStateChanged in AuthContext would pick this up.
            // For this init, we might manually trigger a state update or just show we can't fully login without real keys.
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome Back</Text>
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

            {/* Recaptcha Modal specific to Expo */}
            {/* <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={auth.app.options}
      /> */}
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

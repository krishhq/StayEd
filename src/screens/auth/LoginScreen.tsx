import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { FirebaseRecaptchaVerifierModal, FirebaseRecaptchaBanner } from 'expo-firebase-recaptcha';
import app from '../../config/firebaseConfig';
import { getAuth, PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function LoginScreen({ navigation }: any) {
    const { colors } = useTheme();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationId, setVerificationId] = useState<string | null>(null);
    const recaptchaVerifier = useRef(null);
    const [loading, setLoading] = useState(false);
    const auth = getAuth(app);

    // Dynamic Styles
    const dynamicStyles = {
        container: { backgroundColor: colors.background },
        title: { color: colors.text },
        subtitle: { color: colors.subText },
        input: { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
        card: { backgroundColor: colors.card },
    };

    const sendVerification = async () => {
        if (!phoneNumber) {
            Alert.alert("Error", "Please enter a valid phone number");
            return;
        }
        setLoading(true);
        try {
            const phoneProvider = new PhoneAuthProvider(auth);
            const verificationId = await phoneProvider.verifyPhoneNumber(
                phoneNumber,
                recaptchaVerifier.current!
            );
            setVerificationId(verificationId);
            Alert.alert("Success", "Verification code has been sent to your phone.");
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    const confirmCode = async () => {
        if (!verificationCode) {
            Alert.alert("Error", "Please enter the verification code");
            return;
        }
        setLoading(true);
        try {
            const credential = PhoneAuthProvider.credential(
                verificationId!,
                verificationCode
            );
            await signInWithCredential(auth, credential);
            // AuthContext handles state change automatically
        } catch (error: any) {
            Alert.alert("Error", "Invalid Code");
        } finally {
            setLoading(false);
        }
    };

    // Simulation Handlers
    const { simulateLogin } = useAuth();

    return (
        <View style={[styles.container, dynamicStyles.container]}>
            <FirebaseRecaptchaVerifierModal
                ref={recaptchaVerifier}
                firebaseConfig={app.options}
            />

            <View style={styles.header}>
                <Text style={[styles.title, dynamicStyles.title]}>Hostel StayEd</Text>
                <Text style={[styles.subtitle, dynamicStyles.subtitle]}>Secure & Smart Living</Text>
            </View>

            <View style={[styles.card, dynamicStyles.card]}>
                {!verificationId ? (
                    <>
                        <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
                        <TextInput
                            style={[styles.input, dynamicStyles.input]}
                            placeholder="+91 9876543210"
                            placeholderTextColor={colors.subText}
                            keyboardType="phone-pad"
                            autoComplete="tel"
                            textContentType="telephoneNumber"
                            onChangeText={setPhoneNumber}
                        />
                        <TouchableOpacity
                            style={[styles.btn, loading && styles.btnDisabled]}
                            onPress={sendVerification}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Send OTP</Text>}
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <Text style={[styles.label, { color: colors.text }]}>Enter OTP</Text>
                        <TextInput
                            style={[styles.input, dynamicStyles.input]}
                            placeholder="123456"
                            placeholderTextColor={colors.subText}
                            keyboardType="number-pad"
                            onChangeText={setVerificationCode}
                        />
                        <TouchableOpacity
                            style={[styles.btn, loading && styles.btnDisabled]}
                            onPress={confirmCode}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Verify & Login</Text>}
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {/* Dev Only: Simulation Buttons */}
            <View style={{ marginTop: 30 }}>
                <Text style={{ textAlign: 'center', color: 'gray', marginBottom: 10 }}>--- Developer Simulation ---</Text>
                <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
                    <TouchableOpacity onPress={() => simulateLogin('resident')} style={[styles.simBtn, { backgroundColor: '#4CAF50' }]}>
                        <Text style={{ color: 'white' }}>Resident</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => simulateLogin('admin')} style={[styles.simBtn, { backgroundColor: '#2196F3' }]}>
                        <Text style={{ color: 'white' }}>Admin</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => simulateLogin('guardian')} style={[styles.simBtn, { backgroundColor: '#FF9800' }]}>
                        <Text style={{ color: 'white' }}>Guardian</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Register Hostel Button */}
            <TouchableOpacity
                style={styles.registerHostelBtn}
                onPress={() => navigation.navigate('HostelRegistration')}
            >
                <Text style={styles.registerHostelText}>🏢 Register Your Hostel/PG</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
    },
    card: {
        padding: 25,
        borderRadius: 15,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    label: {
        fontWeight: 'bold',
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
        fontSize: 16,
    },
    btn: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    btnDisabled: {
        opacity: 0.7,
    },
    btnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    simBtn: {
        padding: 10,
        borderRadius: 5,
    },
    registerHostelBtn: {
        marginTop: 30,
        backgroundColor: '#27ae60',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        elevation: 3,
    },
    registerHostelText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

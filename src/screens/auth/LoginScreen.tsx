import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { FirebaseRecaptchaVerifierModal, FirebaseRecaptchaBanner } from 'expo-firebase-recaptcha';
import app, { auth } from '../../config/firebaseConfig'; // Import auth directly
import { PhoneAuthProvider, signInWithCredential, signInAnonymously } from 'firebase/auth'; // Removed getAuth
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getUserByPhone } from '../../services/firestoreService';

export default function LoginScreen({ navigation }: any) {
    const { colors } = useTheme();
    const { refreshUserData } = useAuth();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationId, setVerificationId] = useState<string | null>(null);
    const recaptchaVerifier = useRef(null);
    const [loading, setLoading] = useState(false);
    // const auth = getAuth(app); // Removed local getAuth

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

            // Fetch User Role
            const userProfile = await getUserByPhone(phoneNumber);
            if (userProfile) {
                // Check if user doc exists with UID
                const uid = auth.currentUser!.uid;
                const userDocRef = doc(db, 'users', uid);
                const userDocSnap = await getDoc(userDocRef);

                if (!userDocSnap.exists()) {
                    // MIGRATION REQUIRED: Link Firestore Doc with Auth UID
                    // The user was registered with a random ID. We need to move it to users/{uid}
                    console.log(`[Login] Migrating user from ${userProfile.id} to ${uid}`);

                    try {
                        // 1. Copy data to new doc (ID = UID)
                        await setDoc(userDocRef, {
                            ...userProfile,
                            id: uid, // Update ID field
                            uid: uid // Add UID field
                        });

                        // 2. Delete old doc (ID = Random)
                        // ONLY delete if the IDs are different (sanity check)
                        if (userProfile.id !== uid) {
                            await deleteDoc(doc(db, 'users', userProfile.id));
                        }

                        Alert.alert("Account Linked", "Your profile has been successfully linked!");
                    } catch (migrationError) {
                        console.error("Migration Error:", migrationError);
                        Alert.alert("Error", "Failed to link profile.");
                    }
                }

                // Determine screen based on role (handled by RootNavigator via AuthContext)
                // We just need to ensure AuthContext has the role.
                // NOTE: In a real app, AuthContext should listen to the user doc.
                // For now, we manually suggest the role if needed, but context userRole is key.
                // @ts-ignore
                Alert.alert("Welcome", `Logged in as ${userProfile.role}`);
            } else {
                Alert.alert("Error", "User not found. Please register.");
                // Optionally sign out if user not found in DB
            }
        } catch (error: any) {
            console.error(error);
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
                {/* Register Hostel Button */}
                <TouchableOpacity
                    style={styles.registerHostelBtn}
                    onPress={() => navigation.navigate('HostelRegistration')}
                >
                    <Text style={styles.registerHostelText}>🏢 Register Your Hostel/PG</Text>
                </TouchableOpacity>

                {/* Dev Mode Login Button */}
                <TouchableOpacity
                    style={styles.devBtn}
                    onPress={async () => {
                        if (!phoneNumber) {
                            Alert.alert("Error", "Please enter phone number first");
                            return;
                        }

                        setLoading(true);
                        try {
                            const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`;
                            console.log(`[LoginScreen] Dev Mode attempt. Current Auth User: ${auth.currentUser?.uid || 'None'}`);
                            console.log(`[LoginScreen] Querying for phone: ${formattedPhone}`);

                            // Lookup user by phone
                            const userProfile = await getUserByPhone(formattedPhone);
                            if (!userProfile) {
                                console.warn(`[LoginScreen] No userProfile found for ${formattedPhone}`);
                                Alert.alert("Error", "No user found with this phone number. Please register first.");
                                setLoading(false);
                                return;
                            }
                            console.log(`[LoginScreen] Found profile for ${userProfile.role}: ${userProfile.name}`);

                            // Sign in anonymously
                            const userCredential = await signInAnonymously(auth);
                            const uid = userCredential.user.uid;

                            // Use AuthContext to perform migration and refresh state
                            await refreshUserData(uid, formattedPhone);

                            Alert.alert("Dev Login Success", `Logged in as ${userProfile.role}`);
                        } catch (error: any) {
                            console.error("[LoginScreen] Dev Login Error:", error);
                            Alert.alert("Error", error.message);
                        } finally {
                            setLoading(false);
                        }
                    }}
                >
                    <Text style={styles.devBtnText}>[Dev] Skip OTP & Login</Text>
                </TouchableOpacity>
            </View>
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
    devBtn: {
        marginTop: 15,
        backgroundColor: '#e74c3c',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#c0392b',
    },
    devBtnText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
});

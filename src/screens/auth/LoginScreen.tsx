import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import FirebaseRecaptchaVerifierModal from '../../components/FirebaseRecaptcha/FirebaseRecaptchaVerifierModal';
import FirebaseRecaptchaBanner from '../../components/FirebaseRecaptcha/FirebaseRecaptchaBanner';
import app, { auth, firebaseConfig } from '../../config/firebaseConfig'; // Import auth directly
import { PhoneAuthProvider, signInWithCredential, signInAnonymously } from 'firebase/auth'; // Removed getAuth
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getUserByPhone } from '../../services/firestoreService';
import LoadingScreen from '../../components/LoadingScreen';

import { Spacing, BorderRadius, Typography, Shadows } from '../../constants/DesignSystem';

export default function LoginScreen({ navigation }: any) {
    const { colors, theme } = useTheme();
    const { refreshUserData, setNavPaused, isNavPaused } = useAuth();
    const [phoneNumber, setPhoneNumber] = useState('+91');
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationId, setVerificationId] = useState<string | null>(null);
    const recaptchaVerifier = useRef(null);
    const [loading, setLoading] = useState(false);

    const sendVerification = async () => {
        if (!phoneNumber || phoneNumber === '+91') {
            Alert.alert("Error", "Please enter a valid phone number");
            return;
        }
        setLoading(true);
        try {
            const phoneProvider = new PhoneAuthProvider(auth);
            const verificationId = await phoneProvider.verifyPhoneNumber(
                phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`,
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
            setNavPaused(true);
            await signInWithCredential(auth, credential);

            const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`;
            const userProfile = await getUserByPhone(formattedPhone);
            if (userProfile) {
                const uid = auth.currentUser!.uid;
                const userDocRef = doc(db, 'users', uid);
                const userDocSnap = await getDoc(userDocRef);

                if (!userDocSnap.exists()) {
                    console.log(`[Login] Migrating user from ${userProfile.id} to ${uid}`);
                    try {
                        await setDoc(userDocRef, {
                            ...userProfile,
                            id: uid,
                            uid: uid
                        });
                        if (userProfile.id !== uid) {
                            await deleteDoc(doc(db, 'users', userProfile.id));
                        }
                        Alert.alert("Account Linked", "Your profile has been successfully linked!");
                    } catch (migrationError) {
                        console.error("Migration Error:", migrationError);
                        Alert.alert("Error", "Failed to link profile.");
                    }
                }

                Alert.alert(
                    "Welcome",
                    `Logged in as ${userProfile.role}`,
                    [{ text: "OK", onPress: () => setNavPaused(false) }]
                );
            } else {
                Alert.alert("Error", "User not found. Please register.");
                await auth.signOut();
                setLoading(false);
            }
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", "Invalid Code");
            setLoading(false);
        }
    };

    const isAppLoading = loading || isNavPaused;

    if (isAppLoading) {
        return <LoadingScreen message="Signing you in..." />;
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FirebaseRecaptchaVerifierModal
                ref={recaptchaVerifier}
                firebaseConfig={firebaseConfig}
            />

            <View style={styles.header}>
                <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
                <Text style={[styles.title, { color: colors.text }]}>StayEd</Text>
                <Text style={[styles.subtitle, { color: colors.subText }]}>Smart Living, Secure Staying</Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card }, theme === 'light' ? Shadows.lg : { borderWidth: 1, borderColor: colors.border }]}>
                {!verificationId ? (
                    <>
                        <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder="9876543210"
                            placeholderTextColor={colors.subText}
                            keyboardType="phone-pad"
                            autoComplete="tel"
                            textContentType="telephoneNumber"
                            value={phoneNumber}
                            onChangeText={(text) => {
                                if (!text.startsWith('+91')) {
                                    setPhoneNumber('+91' + text.replace(/^\+?9?1?/, ''));
                                } else {
                                    setPhoneNumber(text);
                                }
                            }}
                        />
                        <TouchableOpacity
                            style={[styles.btn, { backgroundColor: colors.primary }]}
                            onPress={sendVerification}
                        >
                            <Text style={styles.btnText}>Send OTP</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <Text style={[styles.label, { color: colors.text }]}>Enter OTP</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder="123456"
                            placeholderTextColor={colors.subText}
                            keyboardType="number-pad"
                            onChangeText={setVerificationCode}
                        />
                        <TouchableOpacity
                            style={[styles.btn, { backgroundColor: colors.primary }]}
                            onPress={confirmCode}
                        >
                            <Text style={styles.btnText}>Verify & Login</Text>
                        </TouchableOpacity>
                    </>
                )}

                <View style={styles.divider}>
                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                    <Text style={[styles.dividerText, { color: colors.subText }]}>OR</Text>
                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                </View>

                <TouchableOpacity
                    style={[styles.registerHostelBtn, { borderColor: colors.success }]}
                    onPress={() => navigation.navigate('HostelRegistration')}
                >
                    <Text style={[styles.registerHostelText, { color: colors.success }]}>🏢 Register Your Hostel/PG</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.devBtn}
                    onPress={async () => {
                        if (!phoneNumber || phoneNumber === '+91') {
                            Alert.alert("Error", "Please enter phone number first");
                            return;
                        }

                        setLoading(true);
                        try {
                            const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`;
                            setNavPaused(true);
                            const userCredential = await signInAnonymously(auth);
                            const uid = userCredential.user.uid;

                            const userProfile = await getUserByPhone(formattedPhone);
                            if (!userProfile) {
                                Alert.alert("Error", "No user found with this phone number.");
                                await auth.signOut();
                                setLoading(false);
                                return;
                            }

                            await refreshUserData(uid, formattedPhone);

                            Alert.alert(
                                "Dev Login Success",
                                `Logged in as ${userProfile.role}`,
                                [{ text: "OK", onPress: () => setNavPaused(false) }]
                            );
                        } catch (error: any) {
                            Alert.alert("Error", error.message);
                            setLoading(false);
                        }
                    }}
                >
                    <Text style={[styles.devBtnText, { color: colors.subText }]}>[Dev] Skip OTP & Login</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xxl,
    },
    logo: {
        width: 100,
        height: 100,
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.xxl,
    },
    title: {
        fontSize: Typography.size.xxxl,
        fontWeight: Typography.weight.bold,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: Typography.size.md,
        marginTop: Spacing.xs,
    },
    card: {
        padding: Spacing.xl,
        borderRadius: BorderRadius.xxl,
    },
    label: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.semibold,
        marginBottom: Spacing.sm,
        marginLeft: Spacing.xs,
    },
    input: {
        borderWidth: 1,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
        fontSize: Typography.size.md,
    },
    btn: {
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        ...Shadows.md,
    },
    btnText: {
        color: 'white',
        fontWeight: Typography.weight.bold,
        fontSize: Typography.size.md,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: Spacing.xl,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: Spacing.md,
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.bold,
    },
    registerHostelBtn: {
        borderWidth: 1.5,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
    },
    registerHostelText: {
        fontSize: Typography.size.md,
        fontWeight: Typography.weight.bold,
    },
    devBtn: {
        marginTop: Spacing.xl,
        alignItems: 'center',
    },
    devBtnText: {
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.medium,
        textDecorationLine: 'underline',
    },
});


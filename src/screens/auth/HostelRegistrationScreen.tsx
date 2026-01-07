import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import * as Location from 'expo-location';
import { registerHostel, registerUser } from '../../services/firestoreService';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import app, { auth } from '../../config/firebaseConfig';
import { PhoneAuthProvider, signInWithCredential, signInAnonymously } from 'firebase/auth';

import { useAuth } from '../../context/AuthContext';

export default function HostelRegistrationScreen({ navigation }: any) {
    const { refreshUserData } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Admin Details
    const [adminName, setAdminName] = useState('');
    const [adminPhone, setAdminPhone] = useState('+91');
    const [adminAadhar, setAdminAadhar] = useState('');
    const [adminAddress, setAdminAddress] = useState('');

    // Hostel Details
    const [hostelName, setHostelName] = useState('');
    const [hostelAddress, setHostelAddress] = useState('');
    const [hostelPincode, setHostelPincode] = useState('');
    const [occupancy, setOccupancy] = useState('');

    // Location
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [locationMethod, setLocationMethod] = useState<'manual' | 'gps' | null>(null);

    // OTP & Auth
    const recaptchaVerifier = useRef(null);
    const [verificationId, setVerificationId] = useState<string | null>(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [showOtpModal, setShowOtpModal] = useState(false);

    const validateStep1 = () => {
        if (!adminName.trim()) {
            Alert.alert('Error', 'Please enter admin name');
            return false;
        }
        const purePhone = adminPhone.replace('+91', '').trim();
        if (!purePhone || purePhone.length !== 10) {
            Alert.alert('Error', 'Please enter valid 10-digit phone number');
            return false;
        }
        if (!adminAadhar.trim() || adminAadhar.length !== 12) {
            Alert.alert('Error', 'Please enter valid 12-digit Aadhar number');
            return false;
        }
        if (!adminAddress.trim()) {
            Alert.alert('Error', 'Please enter admin address');
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        if (!hostelName.trim()) {
            Alert.alert('Error', 'Please enter hostel/PG name');
            return false;
        }
        if (!hostelAddress.trim()) {
            Alert.alert('Error', 'Please enter hostel address');
            return false;
        }
        if (!hostelPincode.trim() || hostelPincode.length !== 6) {
            Alert.alert('Error', 'Please enter valid 6-digit pincode');
            return false;
        }
        if (!occupancy.trim() || isNaN(Number(occupancy))) {
            Alert.alert('Error', 'Please enter valid occupancy number');
            return false;
        }
        return true;
    };

    const validateStep3 = () => {
        if (!latitude || !longitude) {
            Alert.alert('Error', 'Please set hostel location');
            return false;
        }
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            Alert.alert('Error', 'Invalid coordinates');
            return false;
        }
        return true;
    };

    const handleNext = () => {
        if (step === 1 && validateStep1()) {
            setStep(2);
        } else if (step === 2 && validateStep2()) {
            setStep(3);
        }
    };

    const handleUseGPS = async () => {
        setLoading(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Error', 'Location permission denied');
                setLoading(false);
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setLatitude(location.coords.latitude.toString());
            setLongitude(location.coords.longitude.toString());
            setLocationMethod('gps');
            Alert.alert('Success', 'Location captured successfully!');
        } catch (error) {
            Alert.alert('Error', 'Could not fetch location');
        }
        setLoading(false);
    };

    // 1. Trigger OTP Send
    const initiateRegistration = async () => {
        if (!validateStep3()) return;

        setLoading(true);
        try {
            const phoneProvider = new PhoneAuthProvider(auth);
            const formattedPhone = adminPhone.startsWith('+91') ? adminPhone : `+91${adminPhone}`;
            const vId = await phoneProvider.verifyPhoneNumber(
                formattedPhone,
                recaptchaVerifier.current!
            );
            setVerificationId(vId);
            setShowOtpModal(true);
            Alert.alert('OTP Sent', `Please enter the code sent to ${formattedPhone}`);
        } catch (error: any) {
            Alert.alert('Error Sending OTP', error.message);
        } finally {
            setLoading(false);
        }
    };

    // 2. Verify OTP & Register
    const handleVerifyAndRegister = async () => {
        if (!verificationCode) {
            Alert.alert('Error', 'Please enter verification code');
            return;
        }
        setLoading(true);
        try {
            // A. Sign In
            const credential = PhoneAuthProvider.credential(
                verificationId!,
                verificationCode
            );
            const userCredential = await signInWithCredential(auth, credential);
            const uid = userCredential.user.uid;

            console.log("Authenticated for Registration with UID:", uid);

            // B. Create Hostel Doc
            const hostelId = await registerHostel({
                name: hostelName,
                address: hostelAddress,
                // @ts-ignore
                pincode: hostelPincode,
                // @ts-ignore
                location: {
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude)
                },
                // @ts-ignore
                occupancy: parseInt(occupancy),
                ownerId: uid, // REAL UID Linked!
                // @ts-ignore
                adminDetails: {
                    name: adminName,
                    phone: adminPhone.startsWith('+91') ? adminPhone : `+91${adminPhone}`,
                    aadharNumber: adminAadhar,
                    address: adminAddress
                },
                status: 'approved'
            });

            // C. Create User Doc (Linked to UID)
            await registerUser({
                id: uid,
                uid: uid,
                name: adminName,
                phone: adminPhone.startsWith('+91') ? adminPhone : `+91${adminPhone}`,
                role: 'admin',
                hostelId: hostelId,
            }, uid); // Pass UID as second arg!

            setShowOtpModal(false);
            // D. Refresh Auth Context to update User Role
            await refreshUserData(uid);

            Alert.alert(
                'Success!',
                'Hostel registered successfully! You are now logged in.',
                [
                    {
                        text: 'OK',
                        onPress: () => { }
                    }
                ]
            );

        } catch (error: any) {
            console.error("Registration Error", error);
            Alert.alert('Error', error.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    // 3. Dev Mode Bypass
    const handleDevRegistration = async () => {
        if (!validateStep3()) return;
        setLoading(true);
        try {
            console.log("Starting Dev Registration (Anonymous)...");

            // A. Sign In Anonymously (Bypass SMS)
            const userCredential = await signInAnonymously(auth);
            const uid = userCredential.user.uid;
            console.log("Dev Authenticated with UID:", uid);

            // B. Create Hostel Doc
            const hostelId = await registerHostel({
                name: hostelName,
                address: hostelAddress,
                // @ts-ignore
                pincode: hostelPincode,
                // @ts-ignore
                location: {
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude)
                },
                // @ts-ignore
                occupancy: parseInt(occupancy),
                ownerId: uid,
                // @ts-ignore
                adminDetails: {
                    name: adminName,
                    phone: adminPhone.startsWith('+91') ? adminPhone : `+91${adminPhone}`,
                    aadharNumber: adminAadhar,
                    address: adminAddress
                },
                status: 'approved'
            });

            // C. Create User Doc 
            await registerUser({
                id: uid,
                uid: uid,
                name: adminName,
                phone: adminPhone.startsWith('+91') ? adminPhone : `+91${adminPhone}`,
                role: 'admin',
                hostelId: hostelId,
                isDevUser: true // Mark as Dev User
            }, uid); // Pass UID as second arg!

            // D. Refresh Auth Context to update User Role
            await refreshUserData(uid);

            Alert.alert(
                'Success (Dev Mode)',
                'Hostel registered without OTP. You are logged in.',
                [
                    {
                        text: 'OK',
                        onPress: () => { } // State change will auto-navigate
                    }
                ]
            );
        } catch (error: any) {
            console.error("Dev Registration Error", error);
            Alert.alert('Dev Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <FirebaseRecaptchaVerifierModal
                ref={recaptchaVerifier}
                firebaseConfig={app.options}
            />

            <Text style={styles.title}>Register Your Hostel/PG</Text>
            <Text style={styles.subtitle}>Step {step} of 3</Text>

            {/* Progress Bar */}
            <View style={styles.progressBar}>
                <View style={[styles.progressStep, step >= 1 && styles.progressActive]} />
                <View style={[styles.progressStep, step >= 2 && styles.progressActive]} />
                <View style={[styles.progressStep, step >= 3 && styles.progressActive]} />
            </View>

            {step === 1 && (
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Admin/Warden Details</Text>

                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter admin name"
                        value={adminName}
                        onChangeText={setAdminName}
                    />

                    <Text style={styles.label}>Phone Number *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="10-digit phone number"
                        value={adminPhone}
                        onChangeText={(text) => {
                            if (!text.startsWith('+91')) {
                                setAdminPhone('+91' + text.replace(/^\+?9?1?/, ''));
                            } else {
                                setAdminPhone(text);
                            }
                        }}
                        keyboardType="phone-pad"
                    />

                    <Text style={styles.label}>Aadhar Card Number *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="12-digit Aadhar number"
                        value={adminAadhar}
                        onChangeText={setAdminAadhar}
                        keyboardType="number-pad"
                        maxLength={12}
                    />

                    <Text style={styles.label}>Address *</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Enter admin address"
                        value={adminAddress}
                        onChangeText={setAdminAddress}
                        multiline
                        numberOfLines={3}
                    />

                    <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                        <Text style={styles.btnText}>Next</Text>
                    </TouchableOpacity>
                </View>
            )}

            {step === 2 && (
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Hostel/PG Details</Text>

                    <Text style={styles.label}>Hostel/PG Name *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter hostel name"
                        value={hostelName}
                        onChangeText={setHostelName}
                    />

                    <Text style={styles.label}>Full Address *</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Enter complete address"
                        value={hostelAddress}
                        onChangeText={setHostelAddress}
                        multiline
                        numberOfLines={3}
                    />

                    <Text style={styles.label}>Pincode *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="6-digit pincode"
                        value={hostelPincode}
                        onChangeText={setHostelPincode}
                        keyboardType="number-pad"
                        maxLength={6}
                    />

                    <Text style={styles.label}>Total Occupancy *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Total number of beds"
                        value={occupancy}
                        onChangeText={setOccupancy}
                        keyboardType="number-pad"
                    />

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                            <Text style={styles.btnText}>Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                            <Text style={styles.btnText}>Next</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {step === 3 && (
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Hostel Location</Text>
                    <Text style={styles.helperText}>
                        This location will be used for attendance geofencing
                    </Text>

                    <TouchableOpacity
                        style={styles.gpsBtn}
                        onPress={handleUseGPS}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text style={styles.gpsBtnIcon}>📍</Text>
                                <Text style={styles.btnText}>Use Current Location (GPS)</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.orText}>OR</Text>

                    <Text style={styles.label}>Enter Coordinates Manually</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Latitude (e.g., 18.513714)"
                        value={latitude}
                        onChangeText={(text) => {
                            setLatitude(text);
                            setLocationMethod('manual');
                        }}
                        keyboardType="decimal-pad"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Longitude (e.g., 73.819596)"
                        value={longitude}
                        onChangeText={(text) => {
                            setLongitude(text);
                            setLocationMethod('manual');
                        }}
                        keyboardType="decimal-pad"
                    />

                    {latitude && longitude && (
                        <View style={styles.locationPreview}>
                            <Text style={styles.locationPreviewText}>
                                📍 Location: {parseFloat(latitude).toFixed(6)}, {parseFloat(longitude).toFixed(6)}
                            </Text>
                        </View>
                    )}

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
                            <Text style={styles.btnText}>Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitBtn, loading && styles.btnDisabled]}
                            onPress={initiateRegistration} // Trigger OTP first!
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.btnText}>Verify & Register Hostel</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Dev Bypass Button */}
                    <TouchableOpacity
                        style={[styles.devBtn, { marginTop: 15 }]}
                        onPress={handleDevRegistration}
                    >
                        <Text style={styles.devBtnText}>[Dev] Skip OTP & Register</Text>
                    </TouchableOpacity>
                </View>
            )}

            <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            {/* OTP Modal */}
            <Modal visible={showOtpModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Enter OTP</Text>
                        <Text style={styles.modalSub}>Sent to {adminPhone}</Text>


                        <TextInput
                            style={styles.otpInput}
                            placeholder="123456"
                            keyboardType="number-pad"
                            onChangeText={setVerificationCode}
                            autoFocus
                        />

                        <TouchableOpacity
                            style={styles.verifyBtn}
                            onPress={handleVerifyAndRegister}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Verify & Create Account</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowOtpModal(false)}>
                            <Text style={styles.closeModalText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginTop: 40,
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
        color: '#7f8c8d',
        marginBottom: 20,
    },
    progressBar: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 30,
    },
    progressStep: {
        flex: 1,
        height: 4,
        backgroundColor: '#e0e0e0',
        borderRadius: 2,
    },
    progressActive: {
        backgroundColor: '#007AFF',
    },
    formSection: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 15,
        marginBottom: 20,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 15,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#34495e',
        marginBottom: 5,
        marginTop: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fafafa',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
    },
    nextBtn: {
        flex: 1,
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    backBtn: {
        flex: 1,
        backgroundColor: '#95a5a6',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    submitBtn: {
        flex: 1,
        backgroundColor: '#27ae60',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    gpsBtn: {
        backgroundColor: '#3498db',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
    },
    gpsBtnIcon: {
        fontSize: 20,
    },
    btnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    btnDisabled: {
        opacity: 0.6,
    },
    orText: {
        textAlign: 'center',
        color: '#7f8c8d',
        marginVertical: 15,
        fontSize: 14,
    },
    helperText: {
        color: '#7f8c8d',
        fontSize: 13,
        marginBottom: 15,
    },
    locationPreview: {
        backgroundColor: '#e8f5e9',
        padding: 12,
        borderRadius: 8,
        marginTop: 10,
    },
    locationPreviewText: {
        color: '#27ae60',
        fontSize: 14,
    },
    cancelBtn: {
        padding: 15,
        alignItems: 'center',
        marginBottom: 30,
    },
    cancelText: {
        color: '#e74c3c',
        fontSize: 16,
        fontWeight: '600',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        elevation: 5,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    modalSub: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    otpInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        width: '100%',
        padding: 15,
        fontSize: 24,
        textAlign: 'center',
        letterSpacing: 5,
        marginBottom: 20,
    },
    verifyBtn: {
        backgroundColor: '#27ae60',
        padding: 15,
        borderRadius: 10,
        width: '100%',
        alignItems: 'center',
        marginBottom: 15,
    },
    closeModalText: {
        color: '#e74c3c',
        fontWeight: 'bold',
        fontSize: 16,
    },
    devBtn: {
        backgroundColor: '#e67e22',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        width: '100%',
    },
    devBtnText: {
        color: 'white',
        fontWeight: 'bold',
    }
});

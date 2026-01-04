import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import * as LocalAuthentication from 'expo-local-authentication';
import { db } from '../../config/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

export default function AttendanceScreen() {
    const { user } = useAuth();
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Hostel Coordinates (Mock)
    const HOSTEL_LAT = 12.9716;
    const HOSTEL_LONG = 77.5946;
    const ALLOWED_RADIUS_METERS = 500; // Large radius for demo

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setLocation(location);
        })();
    }, []);

    const verifyBiometric = async () => {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (!hasHardware) {
            Alert.alert('Warning', 'Biometric hardware not available, skipping check (Dev Mode)');
            return true;
        }

        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Verify Identity to Log Entry',
        });
        return result.success;
    };

    const handleLog = async (type: 'Entry' | 'Exit') => {
        setLoading(true);

        // 1. Verify Location
        if (!location) {
            Alert.alert('Error', 'Fetching location...');
            setLoading(false);
            return;
        }

        // Basic distance calc could go here
        // For now, we just log the coordinates

        // 2. Verify Biometric
        const biometricSuccess = await verifyBiometric();
        if (!biometricSuccess) {
            Alert.alert('Failed', 'Biometric verification failed');
            setLoading(false);
            return;
        }

        // 3. Save to Firestore
        try {
            if (user) {
                await addDoc(collection(db, 'attendance'), {
                    userId: user.uid,
                    type,
                    timestamp: serverTimestamp(),
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });
                Alert.alert('Success', `${type} Logged Successfully!`);
            } else {
                console.log(`[Dev] ${type} Logged`, location.coords);
                Alert.alert('Dev Success', `${type} logged to console`);
            }
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
        setLoading(false);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Attendance Check</Text>

            {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

            {location ? (
                <Text style={styles.info}>
                    Location: {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
                </Text>
            ) : (
                <ActivityIndicator />
            )}

            <View style={styles.buttonContainer}>
                <Button title="Check In (Entry)" onPress={() => handleLog('Entry')} color="green" />
                <View style={{ height: 20 }} />
                <Button title="Check Out (Exit)" onPress={() => handleLog('Exit')} color="red" />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
    },
    info: {
        marginBottom: 30,
        fontSize: 16,
    },
    error: {
        color: 'red',
        marginBottom: 20,
    },
    buttonContainer: {
        width: '100%',
    }
});

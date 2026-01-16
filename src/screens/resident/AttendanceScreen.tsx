import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import * as LocalAuthentication from 'expo-local-authentication';
import { db } from '../../config/firebaseConfig';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
    GEOFENCE_RADIUS,
    HOSTEL_COORDINATES,
    calculateDistance,
    isWithinTimeSlot
} from '../../utils/attendanceUtils';

interface EntryExitLog {
    id: string;
    type: 'entry' | 'exit';
    timestamp: any;
    distance?: number;
}

export default function AttendanceScreen() {
    const { user, hostelId, residentId, hostelData } = useAuth();
    const { colors } = useTheme();
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [entryExitLoading, setEntryExitLoading] = useState(false);
    const [distance, setDistance] = useState<number | null>(null);
    const [isInsideCampus, setIsInsideCampus] = useState<boolean>(false);
    const [recentLogs, setRecentLogs] = useState<EntryExitLog[]>([]);

    const dynamicStyles = {
        container: { backgroundColor: colors.background },
        text: { color: colors.text },
        subText: { color: colors.subText },
        card: { backgroundColor: colors.card },
    };

    useEffect(() => {
        // Only fetch recent entry/exit logs on mount
        fetchRecentLogs();
    }, []);

    const fetchRecentLogs = async () => {
        if (!user) return;

        try {
            const q = query(
                collection(db, 'entry_exit_logs'),
                where('userId', '==', user.uid),
                orderBy('timestamp', 'desc'),
                limit(5)
            );
            const snapshot = await getDocs(q);
            const logs: EntryExitLog[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as EntryExitLog));
            setRecentLogs(logs);
        } catch (error) {
            console.log('Error fetching logs:', error);
            setRecentLogs([]);
        }
    };

    const fetchLocation = async () => {
        // Use hostelData from AuthContext (multi-tenant system)
        // Fall back to HOSTEL_COORDINATES if not configured
        const hostelLocation = hostelData?.location || {
            latitude: HOSTEL_COORDINATES.latitude,
            longitude: HOSTEL_COORDINATES.longitude
        };

        if (!hostelLocation) {
            Alert.alert('Error', 'Hostel location not configured');
            return null;
        }

        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                return null;
            }

            let location = await Location.getCurrentPositionAsync({});

            // Calculate distance from hostel
            const dist = calculateDistance(
                location.coords.latitude,
                location.coords.longitude,
                hostelLocation.latitude,
                hostelLocation.longitude
            );

            setLocation(location);
            setDistance(dist);
            setIsInsideCampus(dist <= GEOFENCE_RADIUS);

            return { location, distance: dist, isInside: dist <= GEOFENCE_RADIUS };
        } catch (error) {
            console.log('Error fetching location:', error);
            return null;
        }
    };

    const verifyBiometric = async () => {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (!hasHardware) {
            Alert.alert('Warning', 'Biometric hardware not available, skipping check (Dev Mode)');
            return true;
        }

        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Verify Identity',
        });
        return result.success;
    };

    const handleMarkAttendance = async (bypassTime = false) => {
        // 1. Check Time Slot (Skip if bypassing)
        if (!bypassTime) {
            const timeCheck = isWithinTimeSlot();
            if (!timeCheck.allowed) {
                Alert.alert(
                    'Outside Time Slot',
                    `Attendance can only be marked during:\n• Evening: 8 PM - 9:30 PM\n\nNext slot: ${timeCheck.nextSlot}`
                );
                return;
            }
        } else {
            console.log("Dev Bypass: Skipping Time Constraint");
        }

        setLoading(true);

        // 2. Fetch Location
        const locationData = await fetchLocation();
        if (!locationData) {
            Alert.alert('Error', 'Could not fetch location. Please enable location services.');
            setLoading(false);
            return;
        }

        // 3. Check if inside campus
        if (!locationData.isInside) {
            if (bypassTime) {
                console.log("Dev Bypass: Ignoring Location Distance Check");
                // Force isInside to true for the rest of the logic
                // We keep the actual location data for logging/truth
            } else {
                Alert.alert(
                    '⚠️ Outside Campus',
                    `You are ${locationData.distance.toFixed(0)}m away from campus.\n\nPlease return to campus area (within ${GEOFENCE_RADIUS}m) to mark attendance.`,
                    [{ text: 'OK' }]
                );
                setLoading(false);
                return;
            }
        }

        // 4. Verify Biometric
        const biometricSuccess = await verifyBiometric();
        if (!biometricSuccess) {
            Alert.alert('Failed', 'Biometric verification failed');
            setLoading(false);
            return;
        }

        // 5. Save to Firestore
        try {
            if (user && hostelId) {
                await addDoc(collection(db, 'attendance'), {
                    userId: user.uid,
                    residentId: residentId,
                    hostelId: hostelId,
                    timestamp: serverTimestamp(),
                    latitude: locationData.location.coords.latitude,
                    longitude: locationData.location.coords.longitude,
                    distance: locationData.distance
                });
                Alert.alert('✅ Success', 'Attendance marked successfully!');
            } else {
                console.log('[Dev] Attendance Logged', { location: locationData.location.coords, distance: locationData.distance });
                Alert.alert('✅ Dev Success', 'Attendance logged to console');
            }
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
        setLoading(false);
    };

    const handleEntryExit = async (type: 'entry' | 'exit') => {
        setEntryExitLoading(true);

        // 1. Verify Biometric
        const biometricSuccess = await verifyBiometric();
        if (!biometricSuccess) {
            Alert.alert('Failed', 'Biometric verification failed');
            setEntryExitLoading(false);
            return;
        }

        // 2. Save to Firestore (without location)
        try {
            if (user && hostelId) {
                await addDoc(collection(db, 'entry_exit_logs'), {
                    userId: user.uid,
                    residentId: residentId,
                    hostelId: hostelId,
                    type: type,
                    timestamp: serverTimestamp(),
                });
                Alert.alert('✅ Success', `${type.charAt(0).toUpperCase() + type.slice(1)} logged successfully!`);
                // Refresh logs
                fetchRecentLogs();
            } else {
                console.log(`[Dev] ${type} Logged`);
                Alert.alert('✅ Dev Success', `${type} logged to console`);
            }
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
        setEntryExitLoading(false);
    };

    const formatTimestamp = (timestamp: any) => {
        if (!timestamp) return 'Just now';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('en-IN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <ScrollView style={[styles.container, dynamicStyles.container]}>
            <Text style={[styles.header, dynamicStyles.text]}>Attendance & Entry/Exit</Text>

            {errorMsg ? (
                <Text style={styles.error}>{errorMsg}</Text>
            ) : (
                <>
                    {/* Campus Status Card - Only shown when location is available */}
                    {location && distance !== null && (
                        <View style={[
                            styles.statusCard,
                            { backgroundColor: isInsideCampus ? '#4CAF50' : '#FF5252' }
                        ]}>
                            <Text style={styles.statusIcon}>{isInsideCampus ? '✅' : '❌'}</Text>
                            <Text style={styles.statusText}>
                                {isInsideCampus ? 'Inside Campus' : 'Outside Campus'}
                            </Text>
                            <Text style={styles.statusSubtext}>
                                {distance.toFixed(0)}m from campus
                            </Text>
                        </View>
                    )}

                    {/* Entry/Exit Buttons */}
                    <View style={styles.entryExitContainer}>
                        <Text style={[styles.sectionTitle, dynamicStyles.text]}>Log Entry/Exit</Text>
                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={[styles.entryBtn, entryExitLoading && styles.btnDisabled]}
                                onPress={() => handleEntryExit('entry')}
                                disabled={entryExitLoading}
                            >
                                {entryExitLoading ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <>
                                        <Text style={styles.btnIcon}>🚪➡️</Text>
                                        <Text style={styles.btnText}>Log Entry</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.exitBtn, entryExitLoading && styles.btnDisabled]}
                                onPress={() => handleEntryExit('exit')}
                                disabled={entryExitLoading}
                            >
                                {entryExitLoading ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <>
                                        <Text style={styles.btnIcon}>🚪⬅️</Text>
                                        <Text style={styles.btnText}>Log Exit</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Recent Entry/Exit Logs */}
                    {recentLogs.length > 0 && (
                        <View style={[styles.card, dynamicStyles.card]}>
                            <Text style={[styles.cardTitle, dynamicStyles.text]}>📋 Recent Logs</Text>
                            {recentLogs.map((log) => (
                                <View key={log.id} style={styles.logItem}>
                                    <View style={[
                                        styles.logBadge,
                                        { backgroundColor: log.type === 'entry' ? '#4CAF50' : '#FF5252' }
                                    ]}>
                                        <Text style={styles.logBadgeText}>
                                            {log.type === 'entry' ? '➡️ Entry' : '⬅️ Exit'}
                                        </Text>
                                    </View>
                                    <Text style={[styles.logTime, dynamicStyles.subText]}>
                                        {formatTimestamp(log.timestamp)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Mark Attendance Button */}
                    <View style={styles.attendanceSection}>
                        <Text style={[styles.sectionTitle, dynamicStyles.text]}>Daily Attendance</Text>
                        <TouchableOpacity
                            style={[styles.attendanceBtn, loading && styles.btnDisabled]}
                            onPress={() => handleMarkAttendance(false)}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.btnText}>🔐 Mark Attendance</Text>
                            )}
                        </TouchableOpacity>

                        {/* DEV ONLY BUTTON */}
                        <TouchableOpacity
                            style={[styles.devBtn, { marginTop: 10 }]}
                            onPress={() => {
                                Alert.alert(
                                    'Dev Mode',
                                    'Bypass time constraint and mark attendance?',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Yes, Force Mark', onPress: () => handleMarkAttendance(true) }
                                    ]
                                );
                            }}
                        >
                            <Text style={styles.devBtnText}>🛠️ [Dev] Force Attendance</Text>
                        </TouchableOpacity>

                        {/* Time Slot Info */}
                        <View style={[styles.infoBox, dynamicStyles.card, { marginTop: 15 }]}>
                            <Text style={[styles.infoBoxTitle, dynamicStyles.text]}>⏰ Attendance Time Slots</Text>
                            <Text style={[styles.infoBoxText, dynamicStyles.subText]}>• Evening: 8:00 PM - 9:30 PM</Text>
                        </View>
                    </View>
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        paddingTop: 60,
    },
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center',
    },
    card: {
        padding: 20,
        borderRadius: 15,
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    infoText: {
        fontSize: 14,
        marginVertical: 2,
    },
    distanceText: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    statusCard: {
        padding: 20,
        borderRadius: 15,
        marginBottom: 20,
        alignItems: 'center',
        elevation: 4,
    },
    statusIcon: {
        fontSize: 40,
        marginBottom: 10,
    },
    statusText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    statusSubtext: {
        color: 'white',
        fontSize: 14,
        marginTop: 5,
        textAlign: 'center',
    },
    entryExitContainer: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    entryBtn: {
        flex: 1,
        backgroundColor: '#4CAF50',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 3,
    },
    exitBtn: {
        flex: 1,
        backgroundColor: '#FF5252',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 3,
    },
    btnIcon: {
        fontSize: 24,
        marginBottom: 5,
    },
    attendanceSection: {
        marginTop: 10,
        marginBottom: 20,
    },
    attendanceBtn: {
        backgroundColor: '#007AFF',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 15,
        elevation: 3,
    },
    btnDisabled: {
        opacity: 0.6,
    },
    btnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    infoBox: {
        padding: 15,
        borderRadius: 10,
    },
    infoBoxTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    infoBoxText: {
        fontSize: 13,
        marginVertical: 2,
    },
    logItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    logBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    logBadgeText: {
        color: 'white',
        fontSize: 13,
        fontWeight: 'bold',
    },
    logTime: {
        fontSize: 13,
    },
    error: {
        color: 'red',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
    },
    devBtn: {
        backgroundColor: '#607D8B',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#455A64',
        borderStyle: 'dashed'
    },
    devBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14
    }
});

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Linking, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../config/firebaseConfig';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { ATTENDANCE_SLOTS } from '../../utils/attendanceUtils';

export default function AbsentResidentsScreen({ route }: any) {
    const { slotName, targetSlot } = route.params;
    const { hostelId } = useAuth();
    const { colors } = useTheme();

    const [absentResidents, setAbsentResidents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const dynamicStyles = {
        container: { backgroundColor: colors.background },
        text: { color: colors.text },
        subText: { color: colors.subText },
        card: { backgroundColor: colors.card, borderColor: colors.border },
    };

    useEffect(() => {
        fetchAbsentResidents();
    }, [hostelId, targetSlot]);

    const fetchAbsentResidents = async () => {
        setLoading(true);
        try {
            if (!hostelId) return;

            // 1. Fetch All Active Residents in Hostel
            const residentsRef = collection(db, 'residents');
            const resQ = query(
                residentsRef,
                where("hostelId", "==", hostelId),
                where("status", "==", "active")
            );
            const resSnap = await getDocs(resQ);
            const allResidents: any[] = [];
            resSnap.forEach(doc => {
                allResidents.push({ id: doc.id, ...doc.data() });
            });

            // 2. Fetch Attendance Logs for the target slot
            const startTime = new Date();
            startTime.setHours(Math.floor(ATTENDANCE_SLOTS.EVENING.start), (ATTENDANCE_SLOTS.EVENING.start % 1) * 60, 0, 0);

            const endTime = new Date();
            // Allow checking slightly past the slot end if needed, but usually strictly within slot
            // Since we passed targetSlot, we assume we are checking that specific slot's logic
            // Note: Currently we only support EVENING, so we default to that if simpler

            // Re-using logic from Dashboard: Calculate precise range
            let startHour = 0, endHour = 0;
            if (targetSlot === 'EVENING') {
                startHour = ATTENDANCE_SLOTS.EVENING.start;
                endHour = ATTENDANCE_SLOTS.EVENING.end;
            }
            // Support Morning for future or if requested (though deprecated)
            // else if (targetSlot === 'MORNING') { ... }

            const start = new Date();
            start.setHours(Math.floor(startHour), (startHour % 1) * 60, 0, 0);

            const end = new Date();
            end.setHours(Math.floor(endHour), (endHour % 1) * 60, 0, 0);

            const attendanceRef = collection(db, 'attendance');
            const attQ = query(
                attendanceRef,
                where('hostelId', '==', hostelId),
                where('timestamp', '>=', Timestamp.fromDate(start)),
                where('timestamp', '<=', Timestamp.fromDate(end))
            );

            const attSnap = await getDocs(attQ);
            const attendedIds = new Set<string>();
            attSnap.forEach(doc => {
                attendedIds.add(doc.data().residentId);
            });

            // 3. Filter Absent Residents
            const absentList = allResidents.filter(r => !attendedIds.has(r.id));
            setAbsentResidents(absentList);

        } catch (error) {
            console.error("Error fetching absent residents:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCall = (phoneNumber: string) => {
        if (phoneNumber) {
            Linking.openURL(`tel:${phoneNumber}`);
        }
    };

    const renderItem = ({ item }: any) => (
        <View style={[styles.card, dynamicStyles.card]}>
            <View style={styles.info}>
                <Text style={[styles.name, dynamicStyles.text]}>{item.name}</Text>
                <Text style={[styles.details, dynamicStyles.subText]}>
                    Room: {item.roomNumber || 'N/A'} • Phone: {item.phone}
                </Text>
                {(item.guardianName || item.guardianPhone) && (
                    <Text style={[styles.guardianInfo, dynamicStyles.subText]}>
                        Guardian: {item.guardianName || 'N/A'} ({item.guardianPhone || 'N/A'})
                    </Text>
                )}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                    style={[styles.callBtn, { backgroundColor: '#2196F3' }]}
                    onPress={() => handleCall(item.phone)}
                >
                    <Text style={styles.callIcon}>📱</Text>
                </TouchableOpacity>
                {item.guardianPhone && (
                    <TouchableOpacity
                        style={[styles.callBtn, { backgroundColor: '#FF9800' }]}
                        onPress={() => handleCall(item.guardianPhone)}
                    >
                        <Text style={styles.callIcon}>🏡</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <View style={[styles.container, dynamicStyles.container]}>
            <View style={styles.header}>
                <Text style={[styles.title, dynamicStyles.text]}>Absent: {slotName}</Text>
                <Text style={[styles.count, dynamicStyles.subText]}>Total: {absentResidents.length}</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            ) : (
                <FlatList
                    data={absentResidents}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={[styles.empty, dynamicStyles.subText]}>No residents absent.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    count: {
        fontSize: 14,
        marginTop: 5,
    },
    list: {
        padding: 15,
    },
    card: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        marginBottom: 10,
        borderRadius: 10,
        borderWidth: 1,
        elevation: 2,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    details: {
        fontSize: 14,
    },
    guardianInfo: {
        fontSize: 12,
        marginTop: 4,
        fontStyle: 'italic',
    },
    callBtn: {
        backgroundColor: '#4CAF50',
        padding: 10,
        borderRadius: 25,
        marginLeft: 10,
    },
    callIcon: {
        fontSize: 18,
        color: 'white',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    empty: {
        fontSize: 16,
        fontStyle: 'italic',
    }
});

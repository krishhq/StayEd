import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { db } from '../../config/firebaseConfig';
import { collection, addDoc, getCountFromServer, query, where, serverTimestamp, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { sendBulkNotifications } from '../../utils/notificationUtils';

const MOCK_MENU = {
    'Monday': {
        breakfast: 'Aloo Paratha, Curd, Tea/Coffee',
        lunch: 'Rice, Dal Fry, Mixed Veg, Salad',
        snacks: 'Samosa, Tea',
        dinner: 'Roti, Paneer Butter Masala, Jeera Rice'
    },
    'Tuesday': {
        breakfast: 'Poha, Sprouts, Milk',
        lunch: 'Rajma Chawal, Aloo Jeera, Raita',
        snacks: 'Biscuits, Coffee',
        dinner: 'Roti, Chicken Curry (or Mushroom Mattar), Rice'
    },
    'Wednesday': {
        breakfast: 'Idli, Sambar, Chutney',
        lunch: 'Lemon Rice, Curd Rice, Papad',
        snacks: 'Vada Pav, Tea',
        dinner: 'Egg Curry (or Kofta), Paratha, Rice'
    },
    'Thursday': {
        breakfast: 'Upma, Banana, Milk',
        lunch: 'Kadhi Pakoda, Rice, Bhindi Fry',
        snacks: 'Sandwich, Juice',
        dinner: 'Chole Bhature, Salad'
    },
    'Friday': {
        breakfast: 'Bread Omelette (or Cutlet), Tea',
        lunch: 'Veg Biryani, Raita, Salan',
        snacks: 'Pakora, Tea',
        dinner: 'Fried Rice, Manchurian, Soup'
    },
    'Saturday': {
        breakfast: 'Dosa, Potato Masala, Sambar',
        lunch: 'Khichdi, Kadhi, Achar, Papad',
        snacks: 'Puff, Coffee',
        dinner: 'Special Thali (Sweet included)'
    },
    'Sunday': {
        breakfast: 'Chole Puri, Halwa',
        lunch: 'Special Sunday Feast (Chicken/Paneer)',
        snacks: 'Corn, Tea',
        dinner: 'Light Meal (Dal Rice)'
    }
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function MessMenuScreen() {
    const { user } = useAuth();
    const [selectedDay, setSelectedDay] = useState('Monday');
    const [loading, setLoading] = useState(false);

    const currentMenu = MOCK_MENU[selectedDay as keyof typeof MOCK_MENU];

    const handleSkip = async (mealType: string) => {
        if (!user) return;
        setLoading(true);
        // Unique ID for the meal slot: e.g., "Monday-Lunch"
        const mealId = `${selectedDay}-${mealType}`;

        try {
            // 1. Record the Skip
            await addDoc(collection(db, 'meal_skips'), {
                userId: user.uid,
                mealId,
                date: new Date().toISOString().split('T')[0], // Today's date loose check
                timestamp: serverTimestamp()
            });

            Alert.alert('Success', `You have skipped ${mealType} for ${selectedDay}.`);

            // 2. Check Threshold Logic
            // Fetch Total Residents
            const residentsSnap = await getCountFromServer(collection(db, 'residents'));
            const totalResidents = residentsSnap.data().count;

            // Fetch Total Skips for this MealId
            const skipQ = query(collection(db, 'meal_skips'), where('mealId', '==', mealId));
            const skipSnap = await getCountFromServer(skipQ);
            const totalSkips = skipSnap.data().count;

            // Calculate Percentage
            // Avoid division by zero
            if (totalResidents > 0) {
                const skipPercentage = (totalSkips / totalResidents) * 100;

                if (skipPercentage > 10) {
                    // 3. Alert Admin if > 10%
                    await addDoc(collection(db, 'mess_alerts'), {
                        title: 'High Skip Rate Alert',
                        message: `${skipPercentage.toFixed(1)}% of residents are skipping ${mealId}. Please inform mess.`,
                        mealId,
                        createdAt: serverTimestamp(),
                        isRead: false
                    });

                    // 4. Send Push Notification to all Admins
                    const adminsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin'), where('pushToken', '!=', null)));
                    const adminTokens: string[] = [];
                    adminsSnap.forEach(doc => {
                        const data = doc.data();
                        if (data.pushToken) {
                            adminTokens.push(data.pushToken);
                        }
                    });

                    if (adminTokens.length > 0) {
                        await sendBulkNotifications(
                            adminTokens,
                            '📢 High Mess Skip Alert',
                            `${skipPercentage.toFixed(1)}% residents skipped ${selectedDay} ${mealType}.`,
                            { type: 'mess_alert', mealId }
                        );
                    }

                    console.log('Admin Alerted: High Skip Rate');
                }
            }

        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const renderMealCard = (title: string, content: string, type: string) => (
        <View style={styles.mealCard}>
            <View style={styles.cardHeader}>
                <Text style={styles.mealTitle}>{title}</Text>
                <TouchableOpacity
                    style={styles.skipBtn}
                    onPress={() => handleSkip(type)}
                    disabled={loading}
                >
                    <Text style={styles.skipText}>Skip Meal</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.mealContent}>{content}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Mess Menu</Text>

            {/* Day Selector */}
            <View style={styles.daySelector}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {DAYS.map(day => (
                        <TouchableOpacity
                            key={day}
                            style={[styles.dayBtn, selectedDay === day && styles.activeDayBtn]}
                            onPress={() => setSelectedDay(day)}
                        >
                            <Text style={[styles.dayText, selectedDay === day && styles.activeDayText]}>
                                {day.substring(0, 3)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Menu Display */}
            <ScrollView style={styles.menuContainer}>
                {renderMealCard('☕ Breakfast (8:00 - 9:30)', currentMenu.breakfast, 'Breakfast')}
                {renderMealCard('🍛 Lunch (12:30 - 2:00)', currentMenu.lunch, 'Lunch')}
                {renderMealCard('🍪 Snacks (5:00 - 6:00)', currentMenu.snacks, 'Snacks')}
                {renderMealCard('🍽 Dinner (8:00 - 9:30)', currentMenu.dinner, 'Dinner')}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    daySelector: {
        backgroundColor: 'white',
        paddingVertical: 10,
        paddingHorizontal: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    dayBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginHorizontal: 5,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },
    activeDayBtn: {
        backgroundColor: '#ff6b6b',
    },
    dayText: {
        color: '#666',
        fontWeight: '600',
    },
    activeDayText: {
        color: 'white',
    },
    menuContainer: {
        padding: 15,
    },
    mealCard: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 12,
        marginBottom: 15,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    mealTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2d3436',
    },
    skipBtn: {
        backgroundColor: '#ff7675',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 15,
    },
    skipText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    mealContent: {
        fontSize: 16,
        color: '#636e72',
        lineHeight: 22,
    }
});

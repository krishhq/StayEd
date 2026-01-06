import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { registerForPushNotificationsAsync } from '../utils/notificationUtils';

// Define User Roles
export type UserRole = 'resident' | 'admin' | 'guardian' | null;

interface HostelData {
    id: string;
    name: string;
    address: string;
    location: {
        latitude: number;
        longitude: number;
    };
    occupancy: number;
}

interface AuthContextType {
    user: User | null;
    userData: any | null; // NEW: Full user profile from Firestore
    userRole: UserRole;
    hostelId: string | null;
    residentId: string | null;      // Link to resident record
    linkedResidentId: string | null; // For guardians to link to ward
    hostelData: HostelData | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
    simulateLogin: (role: UserRole) => void;
    refreshUserData: (manualUid?: string, manualPhone?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any | null>(null);
    const [userRole, setUserRole] = useState<UserRole>(null);
    const [hostelId, setHostelId] = useState<string | null>(null);
    const [residentId, setResidentId] = useState<string | null>(null);
    const [linkedResidentId, setLinkedResidentId] = useState<string | null>(null);
    const [hostelData, setHostelData] = useState<HostelData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUserData = async (uid: string, manualPhone?: string) => {
        try {
            console.log(`[AuthContext] Fetching data for UID: ${uid}`);
            const userDocRef = doc(db, 'users', uid);
            let userDoc = await getDoc(userDocRef);

            // AUTO-LINKING LOGIC: If UID doc doesn't exist, search by phone
            // Use manualPhone if provided (for anomalous/dev logins), else use auth phone
            const phoneToSearch = manualPhone || auth.currentUser?.phoneNumber;

            if (!userDoc.exists() && phoneToSearch) {
                console.log(`[AuthContext] UID doc missing, searching by phone: ${phoneToSearch}`);
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where("phone", "==", phoneToSearch));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const placeholderDoc = querySnapshot.docs[0];
                    const placeholderData = placeholderDoc.data();
                    console.log(`[AuthContext] Found placeholder doc: ${placeholderDoc.id}, migrating to UID: ${uid}`);

                    // 1. Create new doc with real UID
                    await setDoc(userDocRef, {
                        ...placeholderData,
                        uid: uid,
                        updatedAt: new Date()
                    });

                    // 2. Delete old placeholder doc (if it's different from UID)
                    if (placeholderDoc.id !== uid) {
                        try {
                            await deleteDoc(doc(db, 'users', placeholderDoc.id));
                        } catch (e) {
                            console.log("[AuthContext] Could not delete placeholder (maybe permission?), continuing...");
                        }
                    }

                    // 3. Re-fetch the newly created doc
                    userDoc = await getDoc(userDocRef);
                }
            }

            if (userDoc.exists()) {
                const data = userDoc.data();
                setUserData(data);

                setUserRole(data.role as UserRole);
                setHostelId(data.hostelId || null);
                setResidentId(data.residentId || null);
                setLinkedResidentId(data.linkedResidentId || null);

                // Fetch hostel data if data.hostelId exists
                if (data.hostelId) {
                    console.log(`[AuthContext] User has hostelId: ${data.hostelId}, fetching hostel details...`);
                    const hostelDocRef = doc(db, 'hostels', data.hostelId);
                    const hostelDoc = await getDoc(hostelDocRef);
                    if (hostelDoc.exists()) {
                        setHostelData({
                            id: hostelDoc.id,
                            ...hostelDoc.data()
                        } as HostelData);
                        console.log(`[AuthContext] Hostel data loaded for: ${hostelDoc.data()?.name}`);
                    } else {
                        console.warn(`[AuthContext] Hostel document NOT FOUND for ID: ${data.hostelId}`);
                    }
                } else {
                    console.log("[AuthContext] User has NO hostelId assigned.");
                }

                // Register Push Notifications
                registerForPushNotificationsAsync().then(token => {
                    if (token) {
                        updateDoc(userDocRef, { pushToken: token });
                    }
                });
                console.log(`[AuthContext] User data loaded successfully:`, data);
            } else {
                console.warn(`[AuthContext] No Firestore document found for UID: ${uid}`);
                setUserData(null);
                setUserRole(null);
                setHostelId(null);
                setResidentId(null);
                setLinkedResidentId(null);
                setHostelData(null);
            }
        } catch (error) {
            console.error("[AuthContext] Error in fetchUserData:", error);
            setUserData(null);
            setUserRole(null);
            setHostelId(null);
            setResidentId(null);
            setLinkedResidentId(null);
            setHostelData(null);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            console.log(`[AuthContext] Auth state changed: ${firebaseUser ? 'User Logged In (' + firebaseUser.uid + ')' : 'User Logged Out'}`);
            setUser(firebaseUser);
            if (firebaseUser) {
                setIsLoading(true);
                await fetchUserData(firebaseUser.uid);
            } else {
                setUserData(null);
                setUserRole(null);
                setHostelId(null);
                setResidentId(null);
                setLinkedResidentId(null);
                setHostelData(null);
            }
            setIsLoading(false);
            console.log(`[AuthContext] Loading complete. Role: ${userRole}, Hostel: ${hostelId}`);
        });

        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!isLoading) {
            console.log("[AuthContext] Final State Check:", {
                uid: user?.uid,
                role: userRole,
                hostelId,
                hasUserData: !!userData,
                hasHostelData: !!hostelData
            });
        }
    }, [isLoading, userRole, hostelId, userData, hostelData]);

    const refreshUserData = async (manualUid?: string, manualPhone?: string) => {
        const targetUid = manualUid || user?.uid;
        if (targetUid) {
            await fetchUserData(targetUid, manualPhone);
        }
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
        setUserRole(null);
        setUser(null);
        setHostelId(null);
        setResidentId(null);
        setLinkedResidentId(null);
        setHostelData(null);
    };

    // DEV ONLY: Simulate login for testing without Firebase
    const simulateLogin = (role: UserRole) => {
        setUser({ uid: 'dev-user-id', email: 'dev@test.com' } as User);
        setUserRole(role);
        // Set mock hostel data for dev mode
        setHostelId('dev-hostel-id');
        setHostelData({
            id: 'dev-hostel-id',
            name: 'Dev Hostel',
            address: 'Dev Address',
            location: {
                latitude: 18.513714,
                longitude: 73.819596
            },
            occupancy: 50
        });
        setIsLoading(false);
    };

    return (
        <AuthContext.Provider value={{
            user,
            userData,
            userRole,
            hostelId,
            residentId,
            linkedResidentId,
            hostelData,
            isLoading,
            signOut,
            simulateLogin,
            refreshUserData
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

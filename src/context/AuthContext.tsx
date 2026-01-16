import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { registerForPushNotificationsAsync } from '../utils/notificationUtils';
import { getUserByPhone } from '../services/firestoreService';

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
    isNavPaused: boolean;
    setNavPaused: (paused: boolean) => void;
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
    const [isNavPaused, setNavPaused] = useState(false);

    // Request Tracking to prevent race conditions
    const fetchIdRef = React.useRef(0);

    const fetchUserData = async (uid: string, manualPhone?: string) => {
        const currentFetchId = ++fetchIdRef.current;
        try {
            console.log(`[AuthContext] [#${currentFetchId}] Fetching data for UID: ${uid} (manualPhone: ${manualPhone || 'none'})`);
            const userDocRef = doc(db, 'users', uid);
            let userDoc = await getDoc(userDocRef);

            // AUTO-LINKING LOGIC: If UID doc doesn't exist, search by phone
            // Use manualPhone if provided (for anomalous/dev logins), else use auth phone
            const phoneToSearch = manualPhone || auth.currentUser?.phoneNumber;

            if (!userDoc.exists() && phoneToSearch) {
                console.log(`[AuthContext] [#${currentFetchId}] UID doc missing, searching by phone: ${phoneToSearch}`);
                const placeholderData = await getUserByPhone(phoneToSearch);

                if (placeholderData) {
                    console.log(`[AuthContext] [#${currentFetchId}] Found placeholder doc: ${placeholderData.id}, migrating to UID: ${uid}`);

                    // 1. Create new doc with real UID
                    await setDoc(userDocRef, {
                        ...placeholderData,
                        uid: uid,
                        updatedAt: new Date()
                    });

                    // 2. Delete old placeholder doc (if it's different from UID)
                    if (placeholderData.id !== uid) {
                        try {
                            await deleteDoc(doc(db, 'users', placeholderData.id));
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

                // Check if this fetch is still current
                if (currentFetchId !== fetchIdRef.current) {
                    console.log(`[AuthContext] [#${currentFetchId}] Fetch superseded, ignoring result.`);
                    return;
                }

                console.log(`[AuthContext] [#${currentFetchId}] Document found. Role: ${data.role}, HostelId: ${data.hostelId}`);

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
                    console.log("[AuthContext] User has NO hostelId assigned in Firestore document.");
                }

                // Register Push Notifications
                registerForPushNotificationsAsync().then(token => {
                    if (token) {
                        updateDoc(userDocRef, { pushToken: token });
                    }
                });
                console.log(`[AuthContext] User data loaded successfully for UID: ${uid}`);
            } else {
                console.warn(`[AuthContext] [#${currentFetchId}] No Firestore document found for UID: ${uid}`);

                // Check if this fetch is still current
                if (currentFetchId !== fetchIdRef.current) {
                    console.log(`[AuthContext] [#${currentFetchId}] Fetch superseded, ignoring reset.`);
                    return;
                }

                setUserData(null);
                setUserRole(null);
                setHostelId(null);
                setResidentId(null);
                setLinkedResidentId(null);
                setHostelData(null);
            }
        } catch (error) {
            console.error("[AuthContext] Error in fetchUserData:", error);
            // Check if this fetch is still current
            if (currentFetchId === fetchIdRef.current) {
                setUserData(null);
                setUserRole(null);
                setHostelId(null);
                setResidentId(null);
                setLinkedResidentId(null);
                setHostelData(null);
            }
        } finally {
            if (currentFetchId === fetchIdRef.current) {
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            console.log(`[AuthContext] Auth state changed: ${firebaseUser ? 'User Logged In (' + firebaseUser.uid + ')' : 'User Logged Out'}`);

            if (firebaseUser) {
                setIsLoading(true); // SET LOADING FIRST
                setUser(firebaseUser);
                await fetchUserData(firebaseUser.uid);
            } else {
                setUser(null);
                setUserData(null);
                setUserRole(null);
                setHostelId(null);
                setResidentId(null);
                setLinkedResidentId(null);
                setHostelData(null);
                setIsLoading(false);
            }
            console.log(`[AuthContext] Auth change handled. Current fetchId: ${fetchIdRef.current}`);
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
            isNavPaused,
            setNavPaused,
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

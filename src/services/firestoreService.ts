import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    doc,
    setDoc,
    getDoc,
    Timestamp,
    orderBy,
    limit,
    updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

// -- Types --
export interface Hostel {
    name: string;
    ownerId: string;
    address: string;
    createdAt: Timestamp;
}

export interface Resident {
    name: string;
    phone: string;
    email?: string;
    roomNumber: string;
    hostelId: string;
    guardianName: string;
    guardianPhone: string;
    permanentAddress?: string;
    aadharCard?: string;
    status: 'active' | 'inactive';
    joinedAt: Timestamp;
}

export interface User {
    id: string;
    name: string;
    phone: string;
    email?: string;
    role: 'admin' | 'resident' | 'guardian';
    hostelId: string;
    uid?: string;
    createdAt?: Timestamp;
    isDevUser?: boolean;
    residentId?: string;      // Links user doc to resident doc
    linkedResidentId?: string; // For guardians to link to ward
    // Add other user properties as needed
}

// -- Collections --
const HOSTELS_COLLECTION = 'hostels';
const RESIDENTS_COLLECTION = 'residents';
const USERS_COLLECTION = 'users';

/**
 * Register a new Hostel (Auto-ID or Custom ID)
 */
export const registerHostel = async (data: Omit<Hostel, 'createdAt'>, customId?: string) => {
    try {
        let hostelRef;
        if (customId) {
            hostelRef = doc(db, HOSTELS_COLLECTION, customId);
            await setDoc(hostelRef, {
                ...data,
                createdAt: Timestamp.now()
            });
            console.log("Hostel registered with Custom ID:", customId);
            return customId;
        } else {
            const collectionRef = collection(db, HOSTELS_COLLECTION);
            hostelRef = await addDoc(collectionRef, {
                ...data,
                createdAt: Timestamp.now()
            });
            console.log("Hostel registered with Auto ID:", hostelRef.id);
            return hostelRef.id;
        }
    } catch (error) {
        console.error("Error registering hostel:", error);
        throw error;
    }
};

/**
 * Register a User (Admin/Resident/Guardian)
 */
/**
 * Register a User (Admin/Resident/Guardian)
 * @param userData User data object
 * @param customId Optional: Force a specific Document ID (usually the Auth UID)
 */
export const registerUser = async (userData: any, customId?: string) => {
    try {
        if (customId) {
            const userDocRef = doc(db, USERS_COLLECTION, customId);
            await setDoc(userDocRef, {
                ...userData,
                createdAt: Timestamp.now()
            });
            console.log("User registered with Custom ID:", customId);
            return customId;
        } else {
            const usersRef = collection(db, USERS_COLLECTION);
            const docRef = await addDoc(usersRef, {
                ...userData,
                createdAt: Timestamp.now()
            });
            console.log("User registered with Auto ID:", docRef.id);
            return docRef.id;
        }
    } catch (error) {
        console.error("Error registering user:", error);
        throw error;
    }
};

/**
 * Get User Profile by Phone Number
 */
export const getUserByPhone = async (phoneNumber: string): Promise<User | null> => {
    try {
        const usersRef = collection(db, USERS_COLLECTION);

        // 1. Try Exact Match
        console.log(`[getUserByPhone] Querying for: ${phoneNumber}`);
        let q = query(usersRef, where("phone", "==", phoneNumber));
        let querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            console.log(`[getUserByPhone] Found exact match`);
            const doc = querySnapshot.docs[0];
            return { id: doc.id, ...doc.data() } as User;
        }

        // 2. Try Fallback: If starts with +91, try without it (or vice versa)
        // This handles cases where Registration saved "98765..." but Login uses "+9198765..."
        let altPhoneNumber = phoneNumber;
        if (phoneNumber.startsWith('+91')) {
            altPhoneNumber = phoneNumber.replace('+91', '').trim();
        } else if (phoneNumber.length === 10) {
            altPhoneNumber = '+91' + phoneNumber;
        }

        if (altPhoneNumber !== phoneNumber) {
            console.log(`[getUserByPhone] Trying fallback query: ${altPhoneNumber}`);
            q = query(usersRef, where("phone", "==", altPhoneNumber));
            querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                console.log(`[getUserByPhone] Found fallback match`);
                const doc = querySnapshot.docs[0];
                return { id: doc.id, ...doc.data() } as User;
            }
        }

        console.log(`[getUserByPhone] No user found`);
        return null;
    } catch (error) {
        console.error("Error getting user by phone:", error);
        throw error;
    }
};

/**
 * Add a Resident to a specific Hostel
 */
export const addResident = async (data: Omit<Resident, 'joinedAt' | 'status'>) => {
    try {
        const residentsRef = collection(db, RESIDENTS_COLLECTION);
        const docRef = await addDoc(residentsRef, {
            ...data,
            status: 'active',
            joinedAt: Timestamp.now()
        });
        console.log("Resident added with ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error adding resident:", error);
        throw error;
    }
};

/**
 * Get all Residents for a specific Hostel
 */
export const getResidentsByHostel = async (hostelId: string) => {
    try {
        const residentsRef = collection(db, RESIDENTS_COLLECTION);
        const q = query(residentsRef, where("hostelId", "==", hostelId));
        const querySnapshot = await getDocs(q);

        const residents: any[] = [];
        querySnapshot.forEach((doc) => {
            residents.push({ id: doc.id, ...doc.data() });
        });
        return residents;
    } catch (error) {
        console.error("Error fetching residents:", error);
        throw error;
    }
};

/**
 * Get Hostel Details
 */
export const getHostelDetails = async (hostelId: string) => {
    try {
        const docRef = doc(db, HOSTELS_COLLECTION, hostelId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.log("No such hostel!");
            return null;
        }
    } catch (error) {
        console.error("Error getting hostel:", error);
        throw error;
    }
};

// -- Complaint Types --
export interface Complaint {
    id?: string;
    hostelId: string;
    residentId: string;
    residentName: string;
    category: 'maintenance' | 'food' | 'cleanliness' | 'wifi' | 'security' | 'other';
    title: string;
    description: string;
    status: 'pending' | 'in-progress' | 'resolved';
    priority: 'low' | 'medium' | 'high';
    createdAt: Timestamp;
    updatedAt: Timestamp;
    resolvedAt?: Timestamp;
    adminNotes?: string;
}

// -- Collections --
const COMPLAINTS_COLLECTION = 'complaints';

/**
 * Add a new Complaint
 */
export const addComplaint = async (data: Omit<Complaint, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    try {
        const complaintsRef = collection(db, COMPLAINTS_COLLECTION);
        const docRef = await addDoc(complaintsRef, {
            ...data,
            status: 'pending',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        console.log("Complaint added with ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error adding complaint:", error);
        throw error;
    }
};

/**
 * Get all Complaints for a specific Hostel
 * @param hostelId - The hostel ID to filter by
 * @param statusFilter - Optional status filter ('pending', 'in-progress', 'resolved')
 * @param residentId - Optional residentId to filter by specific resident
 */
export const getComplaintsByHostel = async (
    hostelId: string,
    statusFilter?: 'pending' | 'in-progress' | 'resolved',
    residentId?: string | string[]
) => {
    try {
        const complaintsRef = collection(db, COMPLAINTS_COLLECTION);
        let constraints = [where("hostelId", "==", hostelId)];

        if (statusFilter) {
            constraints.push(where("status", "==", statusFilter));
        }

        if (residentId) {
            if (Array.isArray(residentId)) {
                constraints.push(where("residentId", "in", residentId));
            } else {
                constraints.push(where("residentId", "==", residentId));
            }
        }

        try {
            // Attempt query with server-side ordering (Requires Index)
            const q = query(complaintsRef, ...constraints, orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);

            const complaints: Complaint[] = [];
            querySnapshot.forEach((doc) => {
                complaints.push({ id: doc.id, ...doc.data() } as Complaint);
            });
            return complaints;
        } catch (indexError) {
            console.log("Composite index might be missing, falling back to client-side sort:", indexError);

            // Fallback: Query WITHOUT orderBy and sort on the client
            const qFallback = query(complaintsRef, ...constraints);
            const querySnapshot = await getDocs(qFallback);

            const complaints: Complaint[] = [];
            querySnapshot.forEach((doc) => {
                complaints.push({ id: doc.id, ...doc.data() } as Complaint);
            });

            // Client-side sort
            return complaints.sort((a, b) => {
                const timeA = a.createdAt?.toMillis() || 0;
                const timeB = b.createdAt?.toMillis() || 0;
                return timeB - timeA;
            });
        }
    } catch (error) {
        console.error("Error fetching complaints:", error);
        throw error;
    }
};

/**
 * Update Complaint Status
 * @param complaintId - The complaint document ID
 * @param status - New status
 * @param adminNotes - Optional admin notes
 */
export const updateComplaintStatus = async (
    complaintId: string,
    status: 'pending' | 'in-progress' | 'resolved',
    adminNotes?: string
) => {
    try {
        const complaintRef = doc(db, COMPLAINTS_COLLECTION, complaintId);
        const updateData: any = {
            status,
            updatedAt: Timestamp.now()
        };

        if (status === 'resolved') {
            updateData.resolvedAt = Timestamp.now();
        }

        if (adminNotes !== undefined) {
            updateData.adminNotes = adminNotes;
        }

        await setDoc(complaintRef, updateData, { merge: true });
        console.log("Complaint status updated:", complaintId);
    } catch (error) {
        console.error("Error updating complaint:", error);
        throw error;
    }
};

// -- Broadcast Types --
export interface Broadcast {
    id?: string;
    hostelId: string;
    title: string;
    message: string;
    priority: 'normal' | 'emergency';
    senderId: string;
    createdAt: Timestamp;
}

const BROADCASTS_COLLECTION = 'broadcasts';

/**
 * Create a new Broadcast and return its ID
 */
export const createBroadcast = async (data: Omit<Broadcast, 'id' | 'createdAt'>) => {
    try {
        const docRef = await addDoc(collection(db, BROADCASTS_COLLECTION), {
            ...data,
            createdAt: Timestamp.now()
        });
        console.log("Broadcast created with ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error creating broadcast:", error);
        throw error;
    }
};

/**
 * Get recent broadcasts for a hostel
 */
export const getRecentBroadcasts = async (hostelId: string, limitCount: number = 20) => {
    try {
        const broadcastsRef = collection(db, BROADCASTS_COLLECTION);
        const q = query(
            broadcastsRef,
            where("hostelId", "==", hostelId),
            orderBy("createdAt", "desc"),
            limit(limitCount)
        );

        try {
            const querySnapshot = await getDocs(q);
            const broadcasts: Broadcast[] = [];
            querySnapshot.forEach((doc) => {
                broadcasts.push({ id: doc.id, ...doc.data() } as Broadcast);
            });
            return broadcasts;
        } catch (indexError) {
            console.warn('[firestoreService] Index missing for broadcasts, falling back to client-side sort');
            const qFallback = query(
                broadcastsRef,
                where("hostelId", "==", hostelId)
            );
            const querySnapshot = await getDocs(qFallback);
            const broadcasts: Broadcast[] = [];
            querySnapshot.forEach((doc) => {
                broadcasts.push({ id: doc.id, ...doc.data() } as Broadcast);
            });

            // Client-side sort and limit
            return broadcasts.sort((a, b) => {
                const timeA = a.createdAt?.toMillis() || 0;
                const timeB = b.createdAt?.toMillis() || 0;
                return timeB - timeA;
            }).slice(0, limitCount);
        }
    } catch (error) {
        console.error("Error fetching broadcasts:", error);
        throw error;
    }
};

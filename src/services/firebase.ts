import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendPasswordResetEmail,
  updateProfile,
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  collection, 
  onSnapshot, 
  getDocFromServer,
  disableNetwork,
  writeBatch,
  getDocs,
  query,
  where,
  updateDoc,
  arrayUnion,
  Unsubscribe
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { Profile, UnclaimedCard, CoffeeChatInvitation, InvitationStatus, ChatMessage, CoffeeChatRecord, CoffeeChatStatus } from '../types';
import { processAndCompressImage, getHighResGooglePhotoUrl } from './imageUtils';
import { triggerWelcomeEmail } from './emailService';

export function normalizeProfilePhotos(profile: Profile): Profile {
  if (!profile) return profile;
  return {
    ...profile,
    photoUrl: getHighResGooglePhotoUrl(profile.photoUrl),
    additionalPhotos: profile.additionalPhotos?.map(url => getHighResGooglePhotoUrl(url))
  };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// With the placeholder config there is no backend. Stay offline so the demo
// does not retry connections to a project that does not exist.
export const isFirebasePlaceholder = String(firebaseConfig.projectId).startsWith('your-');
if (isFirebasePlaceholder) {
  disableNetwork(db).catch(() => {});
}
export const storage = getStorage(app);

// Google Auth Provider configured for Google Accounts
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Test Connection
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration.");
    }
  }
}

// Fetch Profile from Firestore
export async function fetchUserProfile(uid: string): Promise<Profile | null> {
  const path = `profiles/${uid}`;
  try {
    const docRef = doc(db, 'profiles', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return normalizeProfilePhotos(docSnap.data() as Profile);
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// Helper to sanitize objects for Firestore (removes all undefined fields recursively)
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleanObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleanObj[key] = sanitizeForFirestore(value);
      }
    }
    return cleanObj as T;
  }
  return data;
}

// Save or Update Profile in Firestore
export async function saveUserProfile(profile: Profile): Promise<boolean> {
  const path = `profiles/${profile.uid}`;
  try {
    const docRef = doc(db, 'profiles', profile.uid);
    const cleanData = sanitizeForFirestore({
      ...profile,
      photoUrl: getHighResGooglePhotoUrl(profile.photoUrl),
      additionalPhotos: profile.additionalPhotos?.map(url => getHighResGooglePhotoUrl(url)),
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, cleanData, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// Delete Profile from Firestore
export async function deleteUserProfile(uid: string): Promise<boolean> {
  const path = `profiles/${uid}`;
  try {
    const docRef = doc(db, 'profiles', uid);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// Subscribe to Live Profiles
export function subscribeToLiveProfiles(callback: (profiles: Profile[]) => void): Unsubscribe {
  const path = 'profiles';
  const profilesCol = collection(db, 'profiles');
  
  return onSnapshot(
    profilesCol,
    (snapshot) => {
      const profiles: Profile[] = [];
      snapshot.forEach((d) => {
        profiles.push(normalizeProfilePhotos(d.data() as Profile));
      });
      callback(profiles);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      callback([]);
    }
  );
}

// Fetch all unclaimed cards
export async function fetchUnclaimedCards(): Promise<UnclaimedCard[]> {
  const path = 'unclaimed_cards';
  try {
    const colRef = collection(db, 'unclaimed_cards');
    const snapshot = await getDocs(colRef);
    const cards: UnclaimedCard[] = [];
    snapshot.forEach((docSnap) => {
      cards.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<UnclaimedCard, 'id'>)
      });
    });
    return cards;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Subscribe to unclaimed cards in real-time
export function subscribeToUnclaimedCards(callback: (cards: UnclaimedCard[]) => void): Unsubscribe {
  const path = 'unclaimed_cards';
  const colRef = collection(db, 'unclaimed_cards');
  
  return onSnapshot(
    colRef,
    (snapshot) => {
      const cards: UnclaimedCard[] = [];
      snapshot.forEach((docSnap) => {
        cards.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<UnclaimedCard, 'id'>)
        });
      });
      callback(cards);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      callback([]);
    }
  );
}

/**
 * Automatically dispatches official Section F welcome email strictly to the user's
 * primary registration/login email (authEmail). If they add an additional email,
 * no welcome emails will ever be dispatched to that secondary address.
 * Records persistent delivery tracking in Firestore to prevent duplicate sends.
 */
export async function sendWelcomeEmailToRegisteredUser(
  uid: string,
  profile: Profile,
  forceResend = false
): Promise<boolean> {
  try {
    // If welcome email has already been recorded as sent, do not send duplicate unless forceResend is requested
    if (profile.welcomeEmailSentAt && !forceResend) {
      console.log(`Welcome email already sent to ${profile.welcomeEmailRecipient || uid} on ${profile.welcomeEmailSentAt}`);
      return true;
    }

    // Strict rule: Target the email used to register / log in (authEmail or currentUser email)
    const recipient = profile.welcomeEmailRecipient || auth.currentUser?.email || profile.authEmail || profile.email;
    if (!recipient) {
      console.warn('Cannot send welcome email: no login/auth email found for user', uid);
      return false;
    }

    const result = await triggerWelcomeEmail({
      displayName: profile.fullName || 'Classmate',
      email: recipient, // STRICTLY the registration / login email
      hbsEmail: profile.email || recipient,
      campusHousing: profile.housingBuilding || profile.housingType,
      uid
    });

    if (result.success) {
      const now = new Date().toISOString();
      const profileRef = doc(db, 'profiles', uid);
      await updateDoc(profileRef, {
        welcomeEmailSentAt: now,
        welcomeEmailRecipient: recipient,
        welcomeEmailMessageId: result.messageId || ''
      }).catch(async () => {
        await setDoc(profileRef, {
          welcomeEmailSentAt: now,
          welcomeEmailRecipient: recipient,
          welcomeEmailMessageId: result.messageId || ''
        }, { merge: true });
      });

      // Write audit record to welcome_emails collection
      try {
        const logRef = doc(db, 'welcome_emails', uid);
        await setDoc(logRef, {
          uid,
          recipient,
          fullName: profile.fullName || 'Classmate',
          sentAt: now,
          messageId: result.messageId || '',
          trigger: forceResend ? 'admin_manual_resend' : (profile.unclaimedCardId ? 'card_claimed' : 'profile_created')
        });
      } catch (logErr) {
        console.warn('Could not write welcome_emails log:', logErr);
      }

      return true;
    }
    return false;
  } catch (err) {
    console.warn('sendWelcomeEmailToRegisteredUser error:', err);
    return false;
  }
}

/**
 * Explicit admin resend function that returns detailed result information
 */
export async function resendWelcomeEmail(
  uid: string,
  profile: Profile
): Promise<{ success: boolean; messageId?: string; recipient?: string; error?: string }> {
  try {
    const recipient = profile.welcomeEmailRecipient || profile.authEmail || auth.currentUser?.email || profile.email;
    if (!recipient) {
      return { success: false, error: 'No verified registration email found for this classmate.' };
    }

    const result = await triggerWelcomeEmail({
      displayName: profile.fullName || 'Classmate',
      email: recipient,
      hbsEmail: profile.email || recipient,
      campusHousing: profile.housingBuilding || profile.housingType,
      uid
    });

    if (result.success) {
      const now = new Date().toISOString();
      const profileRef = doc(db, 'profiles', uid);
      await setDoc(profileRef, {
        welcomeEmailSentAt: now,
        welcomeEmailRecipient: recipient,
        welcomeEmailMessageId: result.messageId || ''
      }, { merge: true });

      try {
        const logRef = doc(db, 'welcome_emails', uid);
        await setDoc(logRef, {
          uid,
          recipient,
          fullName: profile.fullName || 'Classmate',
          sentAt: now,
          messageId: result.messageId || '',
          trigger: 'admin_manual_resend'
        }, { merge: true });
      } catch (logErr) {
        console.warn('Could not write welcome_emails log:', logErr);
      }

      return { success: true, messageId: result.messageId, recipient };
    }
    return { success: false, error: 'Email service returned failure.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to dispatch email' };
  }
}


// Claim an unclaimed card & create the live active profile in profiles/{uid}
export async function claimUnclaimedCard(
  cardId: string, 
  uid: string, 
  profileData: Profile
): Promise<boolean> {
  const profilesPath = `profiles/${uid}`;
  const unclaimedPath = `unclaimed_cards/${cardId}`;
  try {
    // 1. Prepare sanitized profile with timestamps and auth info
    const cleanProfile = sanitizeForFirestore<Profile>({
      ...profileData,
      photoUrl: getHighResGooglePhotoUrl(profileData.photoUrl),
      additionalPhotos: profileData.additionalPhotos?.map(url => getHighResGooglePhotoUrl(url)),
      uid,
      authEmail: auth.currentUser?.email || profileData.authEmail || profileData.email || '',
      unclaimedCardId: cardId,
      createdAt: profileData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 2. Save profile to profiles/{uid}
    const profileRef = doc(db, 'profiles', uid);
    await setDoc(profileRef, cleanProfile, { merge: true });

    // 3. Mark the card in unclaimed_cards as claimed
    if (cardId) {
      const cardRef = doc(db, 'unclaimed_cards', cardId);
      await updateDoc(cardRef, {
        claimed: true,
        claimedByUid: uid,
        claimedAt: new Date().toISOString()
      });
    }

    // 4. Asynchronously dispatch official Section F Welcome Email strictly to login / registration email
    sendWelcomeEmailToRegisteredUser(uid, cleanProfile).catch((e) =>
      console.warn('Could not dispatch welcome email:', e)
    );

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${profilesPath} / ${unclaimedPath}`);
    throw error;
  }
}

// Create new fresh profile directly without claiming an existing seed card
export async function createNewProfile(
  uid: string,
  profileData: Profile
): Promise<boolean> {
  const path = `profiles/${uid}`;
  try {
    const cleanProfile = sanitizeForFirestore<Profile>({
      ...profileData,
      photoUrl: getHighResGooglePhotoUrl(profileData.photoUrl),
      additionalPhotos: profileData.additionalPhotos?.map(url => getHighResGooglePhotoUrl(url)),
      uid,
      authEmail: auth.currentUser?.email || profileData.authEmail || profileData.email || '',
      createdAt: profileData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const profileRef = doc(db, 'profiles', uid);
    await setDoc(profileRef, cleanProfile, { merge: true });

    // Asynchronously dispatch official Section F Welcome Email strictly to login / registration email
    sendWelcomeEmailToRegisteredUser(uid, cleanProfile).catch((e) =>
      console.warn('Could not dispatch welcome email:', e)
    );

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// Seed unclaimed_cards collection with batch writes
export async function seedUnclaimedCards(cards: Partial<UnclaimedCard>[]): Promise<number> {
  const path = 'unclaimed_cards';
  try {
    let count = 0;
    // Process in batches of 400 (well within 500 Firestore limit)
    const chunkSize = 400;
    for (let i = 0; i < cards.length; i += chunkSize) {
      const chunk = cards.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      for (const card of chunk) {
        // Document ID can be normalized slug or auto-generated
        const safeId = card.id || (card.fullName 
          ? card.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') 
          : `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
        
        const docRef = doc(db, 'unclaimed_cards', safeId);
        
        const cleanCard = sanitizeForFirestore({
          fullName: card.fullName || 'Classmate',
          nickname: card.nickname || '',
          pronunciation: card.pronunciation || '',
          hometown: card.hometown || '',
          homeCountry: card.homeCountry || 'United States',
          housing: card.housing || '',
          preHbsCompany: card.preHbsCompany || '',
          preHbsRole: card.preHbsRole || '',
          companyUrl: card.companyUrl || '',
          exploringInterests: card.exploringInterests || [],
          hobbies: card.hobbies || '',
          funFact: card.funFact || '',
          venmo: card.venmo || '',
          zelle: card.zelle || '',
          email: card.email || '',
          phone: card.phone || '',
          whatsapp: card.whatsapp || '',
          notOnWhatsApp: card.notOnWhatsApp ?? false,
          birthday: card.birthday || '',
          claimed: card.claimed ?? false,
          claimedByUid: card.claimedByUid || null,
        });

        batch.set(docRef, cleanCard, { merge: true });
        count++;
      }

      await batch.commit();
    }
    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// Seed live profiles collection in batch
export async function seedLiveProfiles(profiles: Profile[]): Promise<number> {
  const path = 'profiles';
  try {
    let count = 0;
    const chunkSize = 400;
    for (let i = 0; i < profiles.length; i += chunkSize) {
      const chunk = profiles.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      for (const p of chunk) {
        const docRef = doc(db, 'profiles', p.uid);
        const cleanP = sanitizeForFirestore({
          ...p,
          createdAt: p.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        batch.set(docRef, cleanP, { merge: true });
        count++;
      }
      await batch.commit();
    }
    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// Sign In with Google Popup
export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
}

// Sign Out
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// Check if an email already belongs to an existing account (via Firestore profiles or Firebase Auth)
export async function checkEmailExists(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  
  // 1. Check in Firestore registered profiles collection
  try {
    const profilesRef = collection(db, 'profiles');
    const q = query(profilesRef, where('email', '==', cleanEmail));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return true;
    }
  } catch (err) {
    console.warn("Could not query profiles for email existence:", err);
  }

  // 2. Check via Firebase Auth fetchSignInMethodsForEmail
  try {
    const methods = await fetchSignInMethodsForEmail(auth, cleanEmail);
    if (methods && methods.length > 0) {
      return true;
    }
  } catch (err) {
    // If Firebase Auth blocks enumeration, this safely falls through
  }

  return false;
}

// Sign in with Email and Password
export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const result = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    return result.user;
  } catch (error) {
    console.error("Email login error:", error);
    throw error;
  }
}

// Create new user account with Email and Password
export async function registerWithEmail(email: string, pass: string, displayName?: string): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const result = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    if (displayName && result.user) {
      try {
        await updateProfile(result.user, { displayName });
      } catch (err) {
        console.warn("Could not set displayName on new user:", err);
      }
    }
    return result.user;
  } catch (error) {
    console.error("Email registration error:", error);
    throw error;
  }
}

// Send Password Reset Email
export async function resetPassword(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  await sendPasswordResetEmail(auth, cleanEmail);
}

// Upload Photo with instant client-side compression and immediate resolution (<100ms)
export async function uploadProfilePhoto(file: File, _uid?: string): Promise<string> {
  try {
    const { dataUrl } = await processAndCompressImage(file, 720, 0.80);
    return dataUrl;
  } catch (err) {
    console.warn("Fallback to raw FileReader:", err);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  }
}

// -------------------------------------------------------------
// Authorized Members Roster Management (Firestore Cloud Sync)
// -------------------------------------------------------------
export interface FirestoreAuthorizedMember {
  displayName: string;
  rawName: string;
  hbsEmail: string;
  personalEmail?: string;
  updatedAt?: string;
}

/**
 * Sync the full Section F roster to the Firestore authorized_members collection
 */
export async function syncAuthorizedMembersToFirestore(members: FirestoreAuthorizedMember[]): Promise<number> {
  const path = 'authorized_members';
  try {
    const batch = writeBatch(db);
    let count = 0;

    for (const m of members) {
      const docId = m.hbsEmail.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const docRef = doc(db, 'authorized_members', docId);
      batch.set(docRef, {
        displayName: m.displayName,
        rawName: m.rawName,
        hbsEmail: m.hbsEmail.toLowerCase(),
        personalEmail: m.personalEmail ? m.personalEmail.toLowerCase() : null,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      count++;
    }

    await batch.commit();
    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Fetch all authorized members from the Firestore authorized_members collection
 */
export async function fetchAuthorizedMembersFromFirestore(): Promise<FirestoreAuthorizedMember[]> {
  const path = 'authorized_members';
  try {
    const colRef = collection(db, 'authorized_members');
    const snapshot = await getDocs(colRef);
    const members: FirestoreAuthorizedMember[] = [];
    snapshot.forEach((docSnap) => {
      members.push(docSnap.data() as FirestoreAuthorizedMember);
    });
    return members;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Check if an email is authorized directly in Firestore
 */
export async function isAuthorizedEmailInFirestore(rawEmail: string): Promise<boolean> {
  if (!rawEmail) return false;
  const clean = rawEmail.trim().toLowerCase();
  const docId = clean.replace(/[^a-z0-9]+/g, '_');

  try {
    const docRef = doc(db, 'authorized_members', docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) return true;

    // Check by hbsEmail query or personalEmail query
    const q1 = query(collection(db, 'authorized_members'), where('hbsEmail', '==', clean));
    const s1 = await getDocs(q1);
    if (!s1.empty) return true;

    const q2 = query(collection(db, 'authorized_members'), where('personalEmail', '==', clean));
    const s2 = await getDocs(q2);
    return !s2.empty;
  } catch (err) {
    console.warn('Firestore authorized check error (falling back to local):', err);
    return false;
  }
}

/**
 * Create a new coffee chat invitation in Firestore
 */
export async function createCoffeeChatInvitation(
  invitationData: Omit<CoffeeChatInvitation, 'id' | 'createdAt' | 'status' | 'read'>
): Promise<CoffeeChatInvitation> {
  const inviteId = `invite_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `coffee_chat_invitations/${inviteId}`;
  const now = new Date().toISOString();

  const newInvitation: CoffeeChatInvitation = {
    ...invitationData,
    id: inviteId,
    status: 'pending',
    read: false,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, 'coffee_chat_invitations', inviteId);
    await setDoc(docRef, newInvitation);
    return newInvitation;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

/**
 * Subscribe to incoming coffee chat invitations for the current user
 */
export function subscribeToIncomingInvitations(
  recipientUid: string,
  onUpdate: (invites: CoffeeChatInvitation[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'coffee_chat_invitations');
  const q = query(colRef, where('recipientUid', '==', recipientUid));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: CoffeeChatInvitation[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as CoffeeChatInvitation);
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.warn('Error subscribing to incoming coffee chat invitations:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to outgoing coffee chat invitations sent by the current user
 */
export function subscribeToSentInvitations(
  senderUid: string,
  onUpdate: (invites: CoffeeChatInvitation[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'coffee_chat_invitations');
  const q = query(colRef, where('senderUid', '==', senderUid));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: CoffeeChatInvitation[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as CoffeeChatInvitation);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.warn('Error subscribing to sent coffee chat invitations:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Update the status of a coffee chat invitation (accept, decline, mark read)
 */
export async function updateCoffeeChatInvitationStatus(
  inviteId: string,
  status: InvitationStatus,
  read = true
): Promise<void> {
  const path = `coffee_chat_invitations/${inviteId}`;
  try {
    const docRef = doc(db, 'coffee_chat_invitations', inviteId);
    await updateDoc(docRef, {
      status,
      read,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

/**
 * Mark a coffee chat invitation as read
 */
export async function markCoffeeChatInvitationRead(inviteId: string): Promise<void> {
  const path = `coffee_chat_invitations/${inviteId}`;
  try {
    const docRef = doc(db, 'coffee_chat_invitations', inviteId);
    await updateDoc(docRef, {
      read: true,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

/**
 * Generate a deterministic conversation ID for two users
 */
export function getConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

/**
 * Send an in-app chat message to a classmate
 */
export async function sendChatMessage(params: {
  senderUid: string;
  senderName: string;
  senderPhoto?: string;
  recipientUid: string;
  recipientName: string;
  message: string;
}): Promise<ChatMessage> {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `chat_messages/${messageId}`;
  const conversationId = getConversationId(params.senderUid, params.recipientUid);
  const now = new Date().toISOString();

  const chatMessage: ChatMessage = {
    id: messageId,
    conversationId,
    senderUid: params.senderUid,
    senderName: params.senderName,
    senderPhoto: params.senderPhoto,
    recipientUid: params.recipientUid,
    recipientName: params.recipientName,
    message: params.message.trim(),
    read: false,
    createdAt: now,
  };

  try {
    const docRef = doc(db, 'chat_messages', messageId);
    await setDoc(docRef, chatMessage);
    return chatMessage;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

/**
 * Subscribe to messages in a specific conversation between two classmates
 */
export function subscribeToConversationMessages(
  conversationId: string,
  onUpdate: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'chat_messages');
  const q = query(colRef, where('conversationId', '==', conversationId));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ChatMessage[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as ChatMessage);
      });
      // Sort oldest to newest for chronological chat stream
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.warn('Error subscribing to conversation messages:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to unread messages sent to the current user
 */
export function subscribeToUserUnreadMessages(
  recipientUid: string,
  onUpdate: (unreadMessages: ChatMessage[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'chat_messages');
  const q = query(
    colRef,
    where('recipientUid', '==', recipientUid),
    where('read', '==', false)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ChatMessage[] = [];
      snapshot.forEach((d) => {
        const msg = d.data() as ChatMessage;
        if (!msg.deletedForUids || !msg.deletedForUids.includes(recipientUid)) {
          list.push(msg);
        }
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.warn('Error subscribing to unread messages:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Mark specified chat messages as read
 */
export async function markChatMessagesAsRead(messageIds: string[]): Promise<void> {
  if (!messageIds || messageIds.length === 0) return;
  const path = 'chat_messages';

  try {
    const batch = writeBatch(db);
    for (const msgId of messageIds) {
      const docRef = doc(db, 'chat_messages', msgId);
      batch.update(docRef, { read: true });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

/**
 * Permanently delete a chat message for both sender and recipient in real time
 */
export async function deleteChatMessageForEveryone(messageId: string): Promise<void> {
  const path = `chat_messages/${messageId}`;
  try {
    const docRef = doc(db, 'chat_messages', messageId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * Delete/hide a chat message only for the current user
 */
export async function deleteChatMessageForMe(messageId: string, currentUserId: string): Promise<void> {
  const path = `chat_messages/${messageId}`;
  try {
    const docRef = doc(db, 'chat_messages', messageId);
    await updateDoc(docRef, {
      deletedForUids: arrayUnion(currentUserId),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

// -------------------------------------------------------------
// Private Coffee Chat Records & Tracker Cloud Sync
// -------------------------------------------------------------

/**
 * Subscribe in real-time to a user's private coffee chat records from Firestore
 */
export function subscribeToUserCoffeeChats(
  userUid: string,
  onUpdate: (records: Record<string, CoffeeChatRecord>) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  if (!userUid) return () => {};
  const path = `profiles/${userUid}/coffee_chats`;
  const colRef = collection(db, 'profiles', userUid, 'coffee_chats');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const records: Record<string, CoffeeChatRecord> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as CoffeeChatRecord;
        if (data && data.classmateUid) {
          records[data.classmateUid] = data;
        }
      });
      onUpdate(records);
    },
    (err) => {
      console.warn('Error subscribing to private coffee chat records:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save or update a private coffee chat record in Firestore
 */
export async function saveUserCoffeeChatToFirestore(
  userUid: string,
  classmateUid: string,
  record: CoffeeChatRecord
): Promise<void> {
  if (!userUid || !classmateUid) return;
  const path = `profiles/${userUid}/coffee_chats/${classmateUid}`;

  try {
    const docRef = doc(db, 'profiles', userUid, 'coffee_chats', classmateUid);
    const cleanRecord = sanitizeForFirestore<CoffeeChatRecord>({
      ...record,
      classmateUid,
      updatedAt: record.updatedAt || new Date().toISOString(),
    });
    await setDoc(docRef, cleanRecord, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Delete a private coffee chat record from Firestore
 */
export async function deleteUserCoffeeChatFromFirestore(
  userUid: string,
  classmateUid: string
): Promise<void> {
  if (!userUid || !classmateUid) return;
  const path = `profiles/${userUid}/coffee_chats/${classmateUid}`;

  try {
    const docRef = doc(db, 'profiles', userUid, 'coffee_chats', classmateUid);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// -------------------------------------------------------------
// Shared Bi-Directional Coffee Chat Cloud Synchronization
// -------------------------------------------------------------

export interface SharedCoffeeChatDoc {
  id: string; // pairId: [uid1, uid2].sort().join('___')
  participants: string[];
  status: CoffeeChatStatus;
  scheduledDate?: string;
  scheduledTime?: string;
  locationOrTopic?: string;
  completedAt?: string;
  updatedByUid: string;
  updatedAt: string;
}

export function getSharedCoffeeChatPairId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('___');
}

/**
 * Save or update shared coffee chat status so both counterparties have synchronized status
 */
export async function saveSharedCoffeeChatStatus(
  userUid: string,
  classmateUid: string,
  updates: {
    status: CoffeeChatStatus;
    scheduledDate?: string;
    scheduledTime?: string;
    locationOrTopic?: string;
    completedAt?: string;
  }
): Promise<void> {
  if (!userUid || !classmateUid) return;
  const pairId = getSharedCoffeeChatPairId(userUid, classmateUid);
  const path = `shared_coffee_chats/${pairId}`;

  try {
    const docRef = doc(db, 'shared_coffee_chats', pairId);
    const data: SharedCoffeeChatDoc = {
      id: pairId,
      participants: [userUid, classmateUid],
      status: updates.status,
      scheduledDate: updates.scheduledDate,
      scheduledTime: updates.scheduledTime,
      locationOrTopic: updates.locationOrTopic,
      completedAt: updates.completedAt,
      updatedByUid: userUid,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, sanitizeForFirestore(data), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Subscribe in real-time to all shared coffee chats involving the user
 */
export function subscribeToSharedCoffeeChats(
  userUid: string,
  onUpdate: (sharedDocs: SharedCoffeeChatDoc[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  if (!userUid) return () => {};
  const colRef = collection(db, 'shared_coffee_chats');
  const q = query(colRef, where('participants', 'array-contains', userUid));

  return onSnapshot(
    q,
    (snapshot) => {
      const docs: SharedCoffeeChatDoc[] = [];
      snapshot.forEach((snap) => {
        docs.push(snap.data() as SharedCoffeeChatDoc);
      });
      onUpdate(docs);
    },
    (err) => {
      console.warn('Error subscribing to shared coffee chats:', err);
      if (onError) onError(err);
    }
  );
}




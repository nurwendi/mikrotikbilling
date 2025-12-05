import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

// Ensure data directory and file exist
if (!fs.existsSync(path.dirname(USERS_FILE))) {
    fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
}
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, '[]');
}

export async function getUsers() {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading users file:', error);
        return [];
    }
}

export async function saveUsers(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving users file:', error);
        return false;
    }
}

export async function getUserByUsername(username) {
    const users = await getUsers();
    return users.find(u => u.username === username);
}

export async function getUserById(id) {
    const users = await getUsers();
    return users.find(u => u.id === id);
}

export async function createUser(userData) {
    const users = await getUsers();

    if (users.find(u => u.username === userData.username)) {
        throw new Error('Username already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(userData.password, salt);

    const newUser = {
        id: Date.now().toString(),
        username: userData.username,
        passwordHash,
        role: userData.role || 'viewer',
        isTechnician: userData.isTechnician || false,
        agentRate: userData.agentRate || 0,
        technicianRate: userData.technicianRate || 0,
        prefix: userData.prefix || '',
        fullName: userData.fullName || '',
        phone: userData.phone || '',
        address: userData.address || '',
        agentNumber: userData.agentNumber || '',
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    await saveUsers(users);

    const { passwordHash: _, ...userWithoutPass } = newUser;
    return userWithoutPass;
}

export async function updateUser(id, updates) {
    const users = await getUsers();
    const index = users.findIndex(u => u.id === id);

    if (index === -1) {
        throw new Error('User not found');
    }

    const user = users[index];
    const updatedUser = {
        ...user,
        ...updates,
        // Ensure rates are numbers if provided
        ...(updates.agentRate !== undefined && { agentRate: Number(updates.agentRate) }),
        ...(updates.technicianRate !== undefined && { technicianRate: Number(updates.technicianRate) }),
        ...(updates.prefix !== undefined && { prefix: updates.prefix }),
        ...(updates.fullName !== undefined && { fullName: updates.fullName }),
        ...(updates.phone !== undefined && { phone: updates.phone }),
        ...(updates.address !== undefined && { address: updates.address }),
        ...(updates.agentNumber !== undefined && { agentNumber: updates.agentNumber })
    };

    if (updates.password) {
        const salt = await bcrypt.genSalt(10);
        updatedUser.passwordHash = await bcrypt.hash(updates.password, salt);
        delete updatedUser.password;
    }

    users[index] = updatedUser;
    await saveUsers(users);

    const { passwordHash: _, ...userWithoutPass } = updatedUser;
    return userWithoutPass;
}

export async function deleteUser(id) {
    const users = await getUsers();
    const filteredUsers = users.filter(u => u.id !== id);

    if (users.length === filteredUsers.length) {
        throw new Error('User not found');
    }

    await saveUsers(filteredUsers);
    return true;
}

export async function verifyPassword(username, password) {
    const user = await getUserByUsername(username);
    if (!user) return false;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (isValid) {
        const { passwordHash: _, ...userWithoutPass } = user;
        return userWithoutPass;
    }
    return false;
}

// Initialize default admin if no users exist
(async () => {
    const users = await getUsers();
    if (users.length === 0) {
        console.log('Initializing default admin user...');
        await createUser({
            username: 'admin',
            password: 'admin',
            role: 'admin'
        });
    }
})();

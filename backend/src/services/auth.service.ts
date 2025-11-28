import jwt from 'jsonwebtoken';
import { User, IUser, UserRole } from '../models/index.js';
import mongoose from 'mongoose';

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  department?: string;
  position?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface TokenPayload {
  userId: string;
  role: string;
}

interface AuthResponse {
  user: Partial<IUser>;
  token: string;
}

class AuthService {
  /**
   * Get JWT secret - read at runtime to ensure dotenv is loaded
   */
  private get jwtSecret(): string {
    return process.env.JWT_SECRET || 'default-secret';
  }
  
  /**
   * Get JWT expiration - read at runtime
   */
  private get jwtExpiresIn(): string {
    return process.env.JWT_EXPIRES_IN || '7d';
  }
  
  /**
   * Generate JWT token
   */
  generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
    } as jwt.SignOptions);
  }
  
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    // Check if email already exists
    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      throw new Error('Email already registered');
    }
    
    // Create user
    const user = new User({
      email: data.email.toLowerCase(),
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role || 'user',
      department: data.department,
      position: data.position,
    });
    
    await user.save();
    
    // Generate token
    const token = this.generateToken({
      userId: user._id.toString(),
      role: user.role,
    });
    
    // Return user without password
    const userObj = user.toObject();
    const { password: _, ...userWithoutPassword } = userObj;
    
    return {
      user: userWithoutPassword,
      token,
    };
  }
  
  /**
   * Login user
   */
  async login(data: LoginData): Promise<AuthResponse> {
    // Find user with password field
    const user = await User.findOne({ email: data.email.toLowerCase() }).select('+password');
    
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    if (!user.isActive) {
      throw new Error('Account is deactivated. Contact administrator.');
    }
    
    // Check password
    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }
    
    // Update last seen
    user.lastSeen = new Date();
    await user.save();
    
    // Generate token
    const token = this.generateToken({
      userId: user._id.toString(),
      role: user.role,
    });
    
    // Return user without password
    const userObj = user.toObject();
    const { password: _, ...userWithoutPassword } = userObj;
    
    return {
      user: userWithoutPassword,
      token,
    };
  }
  
  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return null;
    }
    return User.findById(userId);
  }
  
  /**
   * Refresh token
   */
  async refreshToken(userId: string): Promise<string> {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }
    
    return this.generateToken({
      userId: user._id.toString(),
      role: user.role,
    });
  }
  
  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: Partial<Pick<IUser, 'firstName' | 'lastName' | 'phone' | 'timezone' | 'avatar' | 'notificationPreferences' | 'onboardingCompleted'>>
  ): Promise<IUser | null> {
    const allowedUpdates = [
      'firstName', 'lastName', 'phone', 'timezone', 
      'avatar', 'notificationPreferences', 'onboardingCompleted'
    ];
    
    const updateData: Record<string, unknown> = {};
    for (const key of allowedUpdates) {
      if (key in updates) {
        updateData[key] = updates[key as keyof typeof updates];
      }
    }
    
    return User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true });
  }
  
  /**
   * Change password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new Error('User not found');
    }
    
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }
    
    user.password = newPassword;
    await user.save();
  }
}

export const authService = new AuthService();

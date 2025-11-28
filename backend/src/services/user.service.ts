import { User, IUser, UserRole } from '../models/index.js';
import mongoose from 'mongoose';

interface UserFilters {
  role?: UserRole;
  department?: string;
  isActive?: boolean;
  search?: string;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

class UserService {
  /**
   * Get all users with filtering and pagination
   */
  async getUsers(
    filters: UserFilters = {},
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<IUser>> {
    const { page = 1, limit = 20, sortBy = 'firstName', sortOrder = 'asc' } = options;
    const skip = (page - 1) * limit;
    
    // Build query
    const query: Record<string, unknown> = {};
    
    if (filters.role) {
      query.role = filters.role;
    }
    
    if (filters.department) {
      query.department = filters.department;
    }
    
    if (typeof filters.isActive === 'boolean') {
      query.isActive = filters.isActive;
    }
    
    if (filters.search) {
      query.$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
      ];
    }
    
    // Get total count
    const total = await User.countDocuments(query);
    
    // Get paginated results
    const sortOptions: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const users = await User.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);
    
    return {
      data: users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
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
   * Get users by IDs
   */
  async getUsersByIds(userIds: string[]): Promise<IUser[]> {
    const validIds = userIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    return User.find({ _id: { $in: validIds } });
  }
  
  /**
   * Get team members (for managers to see their team)
   */
  async getTeamMembers(managerId: string): Promise<IUser[]> {
    // In a real app, you might have a team/department structure
    // For now, managers can see all active users
    return User.find({ isActive: true }).sort({ firstName: 1 });
  }
  
  /**
   * Update user (manager action)
   */
  async updateUser(
    userId: string,
    updates: Partial<Pick<IUser, 'role' | 'department' | 'position' | 'isActive'>>,
    actorId: string
  ): Promise<IUser | null> {
    // Verify actor is a manager
    const actor = await User.findById(actorId);
    if (!actor || actor.role !== 'manager') {
      throw new Error('Unauthorized: Only managers can update users');
    }
    
    // Prevent self-demotion
    if (userId === actorId && updates.role && updates.role !== 'manager') {
      throw new Error('Cannot demote yourself');
    }
    
    const allowedUpdates = ['role', 'department', 'position', 'isActive'];
    const updateData: Record<string, unknown> = {};
    
    for (const key of allowedUpdates) {
      if (key in updates) {
        updateData[key] = updates[key as keyof typeof updates];
      }
    }
    
    return User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true });
  }
  
  /**
   * Get unique departments
   */
  async getDepartments(): Promise<string[]> {
    const departments = await User.distinct('department', { department: { $ne: null } });
    return departments.filter(Boolean).sort();
  }
  
  /**
   * Get user statistics (for manager dashboard)
   */
  async getUserStats(): Promise<{
    total: number;
    active: number;
    byRole: Record<string, number>;
    byDepartment: Record<string, number>;
    recentlyActive: number;
  }> {
    const [total, active, roleStats, deptStats, recentlyActive] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $match: { department: { $ne: null } } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
      ]),
      User.countDocuments({
        lastSeen: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
    ]);
    
    const byRole: Record<string, number> = {};
    for (const stat of roleStats) {
      byRole[stat._id] = stat.count;
    }
    
    const byDepartment: Record<string, number> = {};
    for (const stat of deptStats) {
      if (stat._id) {
        byDepartment[stat._id] = stat.count;
      }
    }
    
    return {
      total,
      active,
      byRole,
      byDepartment,
      recentlyActive,
    };
  }
  
  /**
   * Search users for mentions/assignments
   */
  async searchUsers(query: string, limit: number = 10): Promise<IUser[]> {
    return User.find({
      isActive: true,
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    })
      .limit(limit)
      .select('firstName lastName email avatar role department');
  }
}

export const userService = new UserService();

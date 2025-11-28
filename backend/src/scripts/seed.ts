import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { User, Task, Message } from '../models/index.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow';

// Sample users data
const usersData = [
  // Managers
  {
    email: 'manager@taskflow.demo',
    password: 'Manager123!',
    firstName: 'Sarah',
    lastName: 'Johnson',
    role: 'manager',
    department: 'Engineering',
    position: 'Engineering Manager',
    timezone: 'America/New_York',
    avatar: null,
  },
  {
    email: 'pm@taskflow.demo',
    password: 'Manager123!',
    firstName: 'Michael',
    lastName: 'Chen',
    role: 'manager',
    department: 'Product',
    position: 'Product Manager',
    timezone: 'America/Los_Angeles',
    avatar: null,
  },
  // Regular users
  {
    email: 'user@taskflow.demo',
    password: 'User1234!',
    firstName: 'Emily',
    lastName: 'Davis',
    role: 'user',
    department: 'Engineering',
    position: 'Senior Developer',
    timezone: 'America/New_York',
    avatar: null,
  },
  {
    email: 'alex.wilson@taskflow.demo',
    password: 'User1234!',
    firstName: 'Alex',
    lastName: 'Wilson',
    role: 'user',
    department: 'Engineering',
    position: 'Full Stack Developer',
    timezone: 'America/Chicago',
    avatar: null,
  },
  {
    email: 'jessica.brown@taskflow.demo',
    password: 'User1234!',
    firstName: 'Jessica',
    lastName: 'Brown',
    role: 'user',
    department: 'Design',
    position: 'UI/UX Designer',
    timezone: 'Europe/London',
    avatar: null,
  },
  {
    email: 'david.lee@taskflow.demo',
    password: 'User1234!',
    firstName: 'David',
    lastName: 'Lee',
    role: 'user',
    department: 'Engineering',
    position: 'Backend Developer',
    timezone: 'Asia/Tokyo',
    avatar: null,
  },
  {
    email: 'sophia.martinez@taskflow.demo',
    password: 'User1234!',
    firstName: 'Sophia',
    lastName: 'Martinez',
    role: 'user',
    department: 'Product',
    position: 'Product Designer',
    timezone: 'America/Los_Angeles',
    avatar: null,
  },
  {
    email: 'james.taylor@taskflow.demo',
    password: 'User1234!',
    firstName: 'James',
    lastName: 'Taylor',
    role: 'user',
    department: 'QA',
    position: 'QA Engineer',
    timezone: 'America/New_York',
    avatar: null,
  },
  {
    email: 'olivia.anderson@taskflow.demo',
    password: 'User1234!',
    firstName: 'Olivia',
    lastName: 'Anderson',
    role: 'user',
    department: 'Engineering',
    position: 'DevOps Engineer',
    timezone: 'Europe/Berlin',
    avatar: null,
  },
  {
    email: 'daniel.thomas@taskflow.demo',
    password: 'User1234!',
    firstName: 'Daniel',
    lastName: 'Thomas',
    role: 'user',
    department: 'Engineering',
    position: 'Frontend Developer',
    timezone: 'America/New_York',
    avatar: null,
  },
  {
    email: 'emma.jackson@taskflow.demo',
    password: 'User1234!',
    firstName: 'Emma',
    lastName: 'Jackson',
    role: 'user',
    department: 'Marketing',
    position: 'Content Strategist',
    timezone: 'America/Chicago',
    avatar: null,
  },
  {
    email: 'william.white@taskflow.demo',
    password: 'User1234!',
    firstName: 'William',
    lastName: 'White',
    role: 'user',
    department: 'Design',
    position: 'Graphic Designer',
    timezone: 'America/Los_Angeles',
    avatar: null,
  },
];

// Task templates
const taskTemplates = [
  // Engineering tasks
  {
    title: 'Implement user authentication flow',
    description: 'Build complete JWT-based authentication system with login, registration, and password reset functionality. Include proper validation and security measures.',
    status: 'done',
    priority: 'high',
    tags: ['backend', 'security', 'authentication'],
    estimatedHours: 16,
    actualHours: 18,
  },
  {
    title: 'Design and implement REST API for tasks',
    description: 'Create RESTful API endpoints for task CRUD operations. Include filtering, pagination, and sorting capabilities.',
    status: 'done',
    priority: 'high',
    tags: ['backend', 'api'],
    estimatedHours: 24,
    actualHours: 22,
  },
  {
    title: 'Build dashboard UI components',
    description: 'Create reusable React components for the dashboard including charts, stats cards, and navigation elements.',
    status: 'in_progress',
    priority: 'high',
    tags: ['frontend', 'ui', 'react'],
    estimatedHours: 20,
  },
  {
    title: 'Implement drag-and-drop for Kanban board',
    description: 'Add drag-and-drop functionality to the Kanban board for task reordering and status changes. Ensure smooth animations and proper state management.',
    status: 'in_progress',
    priority: 'medium',
    tags: ['frontend', 'ui', 'dnd'],
    estimatedHours: 12,
  },
  {
    title: 'Set up MongoDB indexing strategy',
    description: 'Analyze query patterns and implement appropriate indexes for optimal performance. Document indexing decisions.',
    status: 'todo',
    priority: 'medium',
    tags: ['database', 'performance'],
    estimatedHours: 8,
  },
  {
    title: 'Implement WebSocket for real-time updates',
    description: 'Set up Socket.IO for real-time task updates and messaging. Handle reconnection and offline scenarios.',
    status: 'in_review',
    priority: 'high',
    tags: ['backend', 'realtime', 'websocket'],
    estimatedHours: 16,
    actualHours: 14,
  },
  {
    title: 'Create file upload service',
    description: 'Build file upload functionality with size limits, type validation, and storage management. Prepare for S3 integration.',
    status: 'todo',
    priority: 'medium',
    tags: ['backend', 'storage'],
    estimatedHours: 10,
  },
  {
    title: 'Build calendar integration',
    description: 'Implement interactive calendar view with task visualization, drag-to-reschedule, and iCal export functionality.',
    status: 'in_progress',
    priority: 'high',
    tags: ['frontend', 'ui', 'calendar'],
    estimatedHours: 24,
  },
  // Design tasks
  {
    title: 'Design system documentation',
    description: 'Document all design tokens, components, and usage guidelines in a comprehensive style guide.',
    status: 'in_progress',
    priority: 'medium',
    tags: ['design', 'documentation'],
    estimatedHours: 16,
  },
  {
    title: 'Create icon set for task types',
    description: 'Design consistent icon set for different task types, priorities, and statuses.',
    status: 'done',
    priority: 'low',
    tags: ['design', 'icons'],
    estimatedHours: 8,
    actualHours: 6,
  },
  {
    title: 'Mobile responsive layouts',
    description: 'Ensure all views are fully responsive and provide excellent experience on mobile devices.',
    status: 'todo',
    priority: 'high',
    tags: ['design', 'responsive', 'mobile'],
    estimatedHours: 20,
  },
  {
    title: 'Accessibility audit and fixes',
    description: 'Perform comprehensive accessibility audit using screen readers and fix any WCAG violations.',
    status: 'backlog',
    priority: 'medium',
    tags: ['accessibility', 'audit'],
    estimatedHours: 12,
  },
  // QA tasks
  {
    title: 'Write integration tests for auth flow',
    description: 'Create comprehensive integration tests for authentication endpoints including edge cases.',
    status: 'in_progress',
    priority: 'medium',
    tags: ['testing', 'qa'],
    estimatedHours: 12,
  },
  {
    title: 'Performance testing setup',
    description: 'Set up load testing environment and create baseline performance benchmarks.',
    status: 'backlog',
    priority: 'low',
    tags: ['testing', 'performance'],
    estimatedHours: 16,
  },
  {
    title: 'Security penetration testing',
    description: 'Conduct security assessment including SQL injection, XSS, and CSRF vulnerability testing.',
    status: 'todo',
    priority: 'high',
    tags: ['security', 'testing'],
    estimatedHours: 24,
  },
  // DevOps tasks
  {
    title: 'Set up CI/CD pipeline',
    description: 'Configure GitHub Actions for automated testing, building, and deployment to staging environment.',
    status: 'done',
    priority: 'high',
    tags: ['devops', 'ci-cd'],
    estimatedHours: 16,
    actualHours: 20,
  },
  {
    title: 'Docker containerization',
    description: 'Create optimized Dockerfiles for frontend and backend. Set up docker-compose for local development.',
    status: 'in_review',
    priority: 'high',
    tags: ['devops', 'docker'],
    estimatedHours: 12,
    actualHours: 10,
  },
  {
    title: 'Configure monitoring and alerting',
    description: 'Set up application monitoring with error tracking and performance metrics. Configure alerting thresholds.',
    status: 'todo',
    priority: 'medium',
    tags: ['devops', 'monitoring'],
    estimatedHours: 14,
  },
  // Product tasks
  {
    title: 'User research interviews',
    description: 'Conduct 10 user interviews to gather feedback on current task management workflows and pain points.',
    status: 'done',
    priority: 'high',
    tags: ['research', 'ux'],
    estimatedHours: 20,
    actualHours: 24,
  },
  {
    title: 'Feature prioritization workshop',
    description: 'Facilitate workshop with stakeholders to prioritize Q2 feature roadmap based on user feedback.',
    status: 'todo',
    priority: 'medium',
    tags: ['planning', 'workshop'],
    estimatedHours: 8,
  },
  {
    title: 'Competitor analysis report',
    description: 'Research and document competitive landscape, identifying feature gaps and opportunities.',
    status: 'in_progress',
    priority: 'low',
    tags: ['research', 'analysis'],
    estimatedHours: 16,
  },
  // Additional engineering tasks
  {
    title: 'Implement task comments system',
    description: 'Build comment functionality with @mentions, threading, and real-time updates.',
    status: 'done',
    priority: 'medium',
    tags: ['backend', 'frontend'],
    estimatedHours: 16,
    actualHours: 14,
  },
  {
    title: 'Add export functionality',
    description: 'Implement CSV and PDF export for tasks and reports with customizable filters.',
    status: 'in_progress',
    priority: 'medium',
    tags: ['backend', 'export'],
    estimatedHours: 12,
  },
  {
    title: 'Optimize database queries',
    description: 'Profile and optimize slow database queries. Add caching where appropriate.',
    status: 'backlog',
    priority: 'medium',
    tags: ['backend', 'performance', 'database'],
    estimatedHours: 16,
  },
  {
    title: 'Implement notification system',
    description: 'Build in-app notification system with browser push notification support.',
    status: 'todo',
    priority: 'medium',
    tags: ['backend', 'frontend', 'notifications'],
    estimatedHours: 20,
  },
  {
    title: 'Build team workload visualization',
    description: 'Create visual dashboard showing team workload distribution and capacity.',
    status: 'todo',
    priority: 'low',
    tags: ['frontend', 'visualization'],
    estimatedHours: 14,
  },
  {
    title: 'Add keyboard shortcuts',
    description: 'Implement keyboard shortcuts for common actions (new task, search, navigation).',
    status: 'backlog',
    priority: 'low',
    tags: ['frontend', 'ux'],
    estimatedHours: 8,
  },
  {
    title: 'Implement activity feed',
    description: 'Build activity timeline showing task history, comments, and updates.',
    status: 'in_review',
    priority: 'medium',
    tags: ['frontend', 'backend'],
    estimatedHours: 12,
    actualHours: 14,
  },
  {
    title: 'Create onboarding flow',
    description: 'Design and implement guided onboarding experience for new users.',
    status: 'todo',
    priority: 'medium',
    tags: ['frontend', 'ux', 'onboarding'],
    estimatedHours: 16,
  },
  {
    title: 'Add dark mode support',
    description: 'Implement dark mode theme with system preference detection and manual toggle.',
    status: 'backlog',
    priority: 'low',
    tags: ['frontend', 'ui', 'theme'],
    estimatedHours: 12,
  },
  {
    title: 'Build search functionality',
    description: 'Implement full-text search across tasks, comments, and users with filters.',
    status: 'in_progress',
    priority: 'high',
    tags: ['backend', 'frontend', 'search'],
    estimatedHours: 18,
  },
  {
    title: 'API rate limiting implementation',
    description: 'Add rate limiting middleware with configurable limits per endpoint.',
    status: 'done',
    priority: 'medium',
    tags: ['backend', 'security'],
    estimatedHours: 6,
    actualHours: 4,
  },
  {
    title: 'Error handling improvements',
    description: 'Standardize error responses and implement global error handling.',
    status: 'done',
    priority: 'medium',
    tags: ['backend'],
    estimatedHours: 8,
    actualHours: 6,
  },
];

// Sample messages
const messageTemplates = [
  { content: 'Hey team, excited to kick off this new sprint! 🚀', channel: 'general' },
  { content: 'Has anyone reviewed the latest design mockups?', channel: 'general' },
  { content: 'Quick reminder: stand-up at 10am tomorrow', channel: 'general' },
  { content: 'Great progress on the dashboard this week!', channel: 'general' },
  { content: 'Need help with the WebSocket implementation, anyone available?', channel: 'general' },
  { content: 'Just pushed the new API changes, ready for review', channel: 'general' },
  { content: 'Coffee break in 10? ☕', channel: 'general' },
];

async function seed() {
  try {
    console.log('🌱 Starting database seed...\n');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Task.deleteMany({}),
      Message.deleteMany({}),
    ]);
    console.log('✅ Existing data cleared\n');
    
    // Create users
    console.log('👥 Creating users...');
    const users = [];
    
    for (const userData of usersData) {
      // Note: Don't hash password here - the User model pre('save') hook handles it
      const user = new User({
        ...userData,
        isActive: true,
        onboardingCompleted: Math.random() > 0.3, // Most users have completed onboarding
        lastSeen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random last seen within a week
      });
      await user.save();
      users.push(user);
      console.log(`   Created: ${user.firstName} ${user.lastName} (${user.role})`);
    }
    console.log(`✅ Created ${users.length} users\n`);
    
    // Create tasks
    console.log('📋 Creating tasks...');
    const tasks = [];
    const now = new Date();
    
    for (let i = 0; i < taskTemplates.length; i++) {
      const template = taskTemplates[i];
      
      // Assign to random users (1-3 assignees)
      const numAssignees = Math.floor(Math.random() * 3) + 1;
      const shuffledUsers = [...users].sort(() => Math.random() - 0.5);
      const assignees = shuffledUsers.slice(0, numAssignees);
      
      // Random creator (prefer managers for some tasks)
      const managers = users.filter(u => u.role === 'manager');
      const creator = Math.random() > 0.5 
        ? managers[Math.floor(Math.random() * managers.length)]
        : users[Math.floor(Math.random() * users.length)];
      
      // Generate dates
      const createdAt = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      let dueDate: Date | null = null;
      let completedAt: Date | null = null;
      
      if (template.status === 'done') {
        completedAt = new Date(createdAt.getTime() + Math.random() * 14 * 24 * 60 * 60 * 1000);
        dueDate = new Date(completedAt.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000);
      } else if (template.status !== 'backlog') {
        // Set due date in future (some might be overdue)
        const daysOffset = Math.floor(Math.random() * 21) - 7; // -7 to +14 days
        dueDate = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);
      }
      
      // Create activity log
      const activities = [
        {
          type: 'created',
          actor: creator._id,
          description: 'Task created',
          timestamp: createdAt,
        },
      ];
      
      // Add some random activities for non-backlog tasks
      if (template.status !== 'backlog' && Math.random() > 0.3) {
        activities.push({
          type: 'assigned',
          actor: creator._id,
          description: `Assigned to ${assignees.map(a => a.firstName).join(', ')}`,
          timestamp: new Date(createdAt.getTime() + 1000 * 60 * 5),
        });
      }
      
      if (template.status === 'done') {
        activities.push({
          type: 'status_changed',
          actor: assignees[0]._id,
          description: 'Status changed from "in_progress" to "done"',
          timestamp: completedAt!,
        });
      }
      
      // Create some comments
      const comments = [];
      if (Math.random() > 0.5) {
        const commentAuthor = users[Math.floor(Math.random() * users.length)];
        comments.push({
          content: 'Looking good! Let me know if you need any help.',
          author: commentAuthor._id,
          mentions: [],
          createdAt: new Date(createdAt.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(createdAt.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000),
          isEdited: false,
        });
      }
      
      const task = new Task({
        title: template.title,
        description: template.description,
        status: template.status,
        priority: template.priority,
        tags: template.tags,
        estimatedHours: template.estimatedHours,
        actualHours: template.actualHours || 0,
        assignees: assignees.map(a => a._id),
        createdBy: creator._id,
        dueDate,
        completedAt,
        activities,
        comments,
        order: i,
        createdAt,
        updatedAt: completedAt || new Date(createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
      });
      
      await task.save();
      tasks.push(task);
    }
    console.log(`✅ Created ${tasks.length} tasks\n`);
    
    // Create messages
    console.log('💬 Creating messages...');
    const messages = [];
    
    for (const msgTemplate of messageTemplates) {
      const sender = users[Math.floor(Math.random() * users.length)];
      const createdAt = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      
      const message = new Message({
        content: msgTemplate.content,
        sender: sender._id,
        channel: msgTemplate.channel,
        mentions: [],
        readBy: users
          .filter(u => u._id.toString() !== sender._id.toString() && Math.random() > 0.3)
          .map(u => ({ user: u._id, readAt: new Date(createdAt.getTime() + Math.random() * 60 * 60 * 1000) })),
        createdAt,
        updatedAt: createdAt,
      });
      
      await message.save();
      messages.push(message);
    }
    console.log(`✅ Created ${messages.length} messages\n`);
    
    // Print summary
    console.log('═'.repeat(50));
    console.log('🎉 Database seeded successfully!\n');
    console.log('📊 Summary:');
    console.log(`   • Users: ${users.length}`);
    console.log(`   • Tasks: ${tasks.length}`);
    console.log(`   • Messages: ${messages.length}`);
    console.log('\n📝 Demo Accounts:');
    console.log('   Manager Login:');
    console.log('   • Email: manager@taskflow.demo');
    console.log('   • Password: Manager123!');
    console.log('\n   User Login:');
    console.log('   • Email: user@taskflow.demo');
    console.log('   • Password: User1234!');
    console.log('═'.repeat(50));
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();

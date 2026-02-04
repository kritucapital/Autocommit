import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRepository {
    owner: string;
    name: string;
    fullName: string;
    isActive: boolean;
    lastCommitSha: string | null;
    lastCommitAuthor: string | null;
    lastChecked: Date | null;
    autoCommitCount: number;
}

export interface IActivityLog {
    repo: string;
    action: string;
    message: string;
    success: boolean;
    timestamp: Date;
}

export interface IUser extends Document {
    email: string;
    password: string; // bcrypt hashed
    githubToken: string;
    githubUsername: string;
    githubId: number;
    avatarUrl: string;
    repositories: IRepository[];
    activityLogs: IActivityLog[];
    isMonitoringEnabled: boolean;
    pollInterval: number;
    resetPasswordToken: string | null;
    resetPasswordExpires: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const RepositorySchema = new Schema<IRepository>({
    owner: { type: String, required: true },
    name: { type: String, required: true },
    fullName: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    lastCommitSha: { type: String, default: null },
    lastCommitAuthor: { type: String, default: null },
    lastChecked: { type: Date, default: null },
    autoCommitCount: { type: Number, default: 0 },
});

const ActivityLogSchema = new Schema<IActivityLog>({
    repo: { type: String, required: true },
    action: { type: String, required: true },
    message: { type: String, required: true },
    success: { type: Boolean, required: true },
    timestamp: { type: Date, default: Date.now },
});

const UserSchema = new Schema<IUser>(
    {
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true },
        githubToken: { type: String, required: true },
        githubUsername: { type: String, required: true, unique: true },
        githubId: { type: Number, required: true },
        avatarUrl: { type: String, default: '' },
        repositories: { type: [RepositorySchema], default: [] },
        activityLogs: { type: [ActivityLogSchema], default: [] },
        isMonitoringEnabled: { type: Boolean, default: false },
        pollInterval: { type: Number, default: 30000 }, // 30 seconds default
        resetPasswordToken: { type: String, default: null },
        resetPasswordExpires: { type: Date, default: null },
    },
    {
        timestamps: true,
    }
);

// Add index for password reset queries (email and githubUsername already indexed via unique: true)
UserSchema.index({ resetPasswordToken: 1 });

// Prevent model recompilation in development
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;


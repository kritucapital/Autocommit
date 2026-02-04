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

export interface IUser extends Document {
    githubToken: string;
    githubUsername: string;
    githubId: number;
    avatarUrl: string;
    repositories: IRepository[];
    isMonitoringEnabled: boolean;
    pollInterval: number;
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

const UserSchema = new Schema<IUser>(
    {
        githubToken: { type: String, required: true },
        githubUsername: { type: String, required: true, unique: true },
        githubId: { type: Number, required: true },
        avatarUrl: { type: String, default: '' },
        repositories: { type: [RepositorySchema], default: [] },
        isMonitoringEnabled: { type: Boolean, default: false },
        pollInterval: { type: Number, default: 30000 }, // 30 seconds default
    },
    {
        timestamps: true,
    }
);

// Prevent model recompilation in development
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;

/**
 * Mongoose UserProfile model: stores parsed resume / master profile used for matching and JD tailoring.
 */

import mongoose, { Schema, Model } from "mongoose";
import type { UserProfile as UserProfileType } from "@schemas";

export interface IUserProfileDocument extends UserProfileType {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const ExperienceSchema = new Schema(
  {
    company: { type: String, required: true },
    title: { type: String, required: true },
    period: { type: String },
    start: { type: String },
    end: { type: String },
    bullets: { type: [String], default: [] },
  },
  { _id: false },
);

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    bullets: { type: [String] },
    url: { type: String },
  },
  { _id: false },
);

const EducationSchema = new Schema(
  {
    school: { type: String, required: true },
    credential: { type: String },
    period: { type: String },
  },
  { _id: false },
);

const SkillGroupSchema = new Schema(
  {
    name: { type: String, required: true },
    skills: { type: [String], default: [] },
  },
  { _id: false },
);

const ContactsSchema = new Schema(
  {
    email: { type: String },
    phone: { type: String },
    location: { type: String },
    linkedin: { type: String },
    website: { type: String },
  },
  { _id: false },
);

const UserProfileSchema = new Schema<IUserProfileDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    skills: { type: [String], default: [] },
    jobTitles: { type: [String] },
    resumeSummary: { type: String },
    yearsOfExperience: { type: Number, required: false },
    name: { type: String },
    headline: { type: String },
    contacts: { type: ContactsSchema },
    experience: { type: [ExperienceSchema], default: [] },
    projects: { type: [ProjectSchema], default: [] },
    education: { type: [EducationSchema], default: [] },
    honours: { type: [String], default: [] },
    skillGroups: { type: [SkillGroupSchema], default: [] },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const UserProfile: Model<IUserProfileDocument> =
  mongoose.models.UserProfile ??
  mongoose.model<IUserProfileDocument>("UserProfile", UserProfileSchema);

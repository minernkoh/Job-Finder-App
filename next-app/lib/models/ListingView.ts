/**
 * Mongoose ListingView model: tracks when users view/click listings. Used for trending algorithm.
 */

import mongoose, { Schema, Model } from "mongoose";

export interface IListingViewDocument {
  _id: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  viewedAt: Date;
}

const ListingViewSchema = new Schema<IListingViewDocument>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
    viewedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false }
);

ListingViewSchema.index({ listingId: 1, viewedAt: -1 });
ListingViewSchema.index({ viewedAt: -1 });

export const ListingView: Model<IListingViewDocument> =
  mongoose.models.ListingView ??
  mongoose.model<IListingViewDocument>("ListingView", ListingViewSchema);

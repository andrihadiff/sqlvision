import mongoose from "mongoose";

const ChallengeTableColumnSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, default: "TEXT" },
    primary: { type: Boolean, default: false },
    notNull: { type: Boolean, default: false },
    defaultValue: { type: String, default: null },
  },
  { _id: false }
);

const ChallengeTableSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    createSql: { type: String, default: "" },
    columns: { type: [ChallengeTableColumnSchema], default: [] },
    rows: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { _id: false }
);

const ChallengeExpectedResultSchema = new mongoose.Schema(
  {
    columns: { type: [String], default: [] },
    rows: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { _id: false }
);

const ChallengeSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    prompt: { type: String, required: true },
    starterQuery: { type: String, default: "" },
    shareKey: { type: String, required: true, unique: true, index: true },
    tables: { type: [ChallengeTableSchema], default: [] },
    expectedResult: { type: ChallengeExpectedResultSchema, default: () => ({ columns: [], rows: [] }) },
  },
  { timestamps: true }
);

export default mongoose.model("Challenge", ChallengeSchema);

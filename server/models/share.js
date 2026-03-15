import mongoose from "mongoose";

const ShareTableColumnSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, default: "TEXT" },
    primary: { type: Boolean, default: false },
    notNull: { type: Boolean, default: false },
    defaultValue: { type: String, default: null },
  },
  { _id: false }
);

const ShareTableSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    createSql: { type: String, default: "" },
    columns: { type: [ShareTableColumnSchema], default: [] },
    rows: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { _id: false }
);

const ShareSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    query: { type: String, default: "" },
    tables: { type: [ShareTableSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Share", ShareSchema);

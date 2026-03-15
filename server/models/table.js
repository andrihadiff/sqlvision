import mongoose from "mongoose";

const TableColumnSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, default: "TEXT" },
    primary: { type: Boolean, default: false },
    notNull: { type: Boolean, default: false },
    defaultValue: { type: String, default: null },
  },
  { _id: false }
);

const WorkspaceTableSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    createSql: { type: String, default: "" },
    columns: { type: [TableColumnSchema], default: [] },
    rows: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

WorkspaceTableSchema.index({ clientId: 1, name: 1 }, { unique: true });

export default mongoose.model("WorkspaceTable", WorkspaceTableSchema);

export const COLUMN_TYPES = {
  text: { key: "text", label: "Short Text", sql_type: "VARCHAR(255)", default_value: "" },
  longtext: { key: "longtext", label: "Long Text", sql_type: "TEXT", default_value: "" },
  richtext: { key: "richtext", label: "Rich Text (Markdown)", sql_type: "TEXT", default_value: "" },
  image: { key: "image", label: "Image URL", sql_type: "TEXT", default_value: "" },
  link: { key: "link", label: "Link URL", sql_type: "TEXT", default_value: "" },
  number: { key: "number", label: "Number", sql_type: "INTEGER", default_value: "0" },
  boolean: { key: "boolean", label: "True/False", sql_type: "BOOLEAN DEFAULT false", default_value: "false" },
  date: { key: "date", label: "Date", sql_type: "TEXT", default_value: "" },
} as const;

export type ColumnType = keyof typeof COLUMN_TYPES;
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  displayName: varchar("displayName", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
});

export const userChromaCredentials = pgTable("user_chroma_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  apiKey: varchar("api_key", { length: 255 }).notNull(),
  databaseName: varchar("database_name", { length: 255 }).notNull(),
  tenantUuid: uuid("tenant_uuid").notNull(),
});

export const userConnections = pgTable(
  "user_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    connectionId: varchar("connection_id", { length: 255 }).notNull(),
    providerConfigKey: varchar("provider_config_key", {
      length: 255,
    }).notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique().on(table.userId, table.providerConfigKey),
    index("user_connections_connection_id_idx").on(table.connectionId),
  ],
);

export const usersRelations = relations(users, ({ many, one }) => ({
  connections: many(userConnections),
  chromaCredentials: one(userChromaCredentials),
}));

export const userConnectionsRelations = relations(
  userConnections,
  ({ one }) => ({
    user: one(users, {
      fields: [userConnections.userId],
      references: [users.id],
    }),
  }),
);

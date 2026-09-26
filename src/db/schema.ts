import {
    integer,
    pgTable,
    text,
    timestamp,
    varchar,
} from "drizzle-orm/pg-core";

export const todosTable = pgTable("todos", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),

    todo: text().notNull(),

    priority: varchar({ length: 10 }).default("medium").notNull(),

    dueDate: timestamp("due_date", { mode: "date" }),

    createdAt: timestamp("created_at", { mode: "date" })
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updated_at", { mode: "date" })
        .$onUpdate(() => new Date())
        .defaultNow()
        .notNull(),
});
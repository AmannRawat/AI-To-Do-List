import { db } from "./src/db/index.js";
import { todosTable } from "./src/db/schema.js";
import { ilike, eq } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

// Tools
async function getAllTodos() {
    const todo = await db.select().from(todosTable);
    return todo;
}

async function createTodo(todo: string) {
    await db.insert(todosTable).values({
        todo,
    })
}
async function deleteTodoById(id: number) {
    await db.delete(todosTable).where(eq(todosTable.id, id));
}

async function searchTodo(search: string) {
    const todo = await db.select().from(todosTable).where(ilike(todosTable.todo, `%${search}%`));
    return todo;
}

const System_Prompt=`
You are a To-do List Assistant with START, PLAN, OBSERVATION and OUTPUT State.
Wait for the user prompt and first PLAN using available tools.
After Planning, Take Actions with appropriate tools and  wait dor OBSERVATION based the actions.
Once you get the observation, resturn the AI response based on Start Prompt and observations.

You can manage tasks by adding,viewing, deleting, and searching for tasks in the database.
You must strictly follow the JSON output format.

Todo DB schema:
id: Int and primary key
todo: String and not null
createdAt: Timestamp and default to now
updatedAt: Timestamp and default to now

Available commands:
-getAllTodos: Return all the Todos from database
-createTodo: Create a new Todo. You will be given the task description.
-deleteTodoById: Delete a Todo by its ID. You will be given the ID of the task to delete.
-searchTodo: Search for all Todos matching the search string using ilike operator. You will be given a search string.

EXAMPLE:
START
{"type":"user","user":"Add a new task to buy groceries."}
{"type":"assistant","assistant":"PLAN: I will create a new Todo with the description 'buy groceries'."}
{"type":"action","action":"createTodo","parameters":{"todo":"buy groceries"}}
{"type":"observation","observation":"Todo created successfully."}
{"type":"assistant","assistant":"The task 'buy groceries' has been added to your to-do list."}
`
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { db } from "./db/index.js";
import { todosTable } from "./db/schema.js";
import { ilike, eq } from "drizzle-orm";
import readlineSync from "readline-sync";

//AI PART
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
});


// Tools
async function getAllTodos() {
    const todo = await db.select().from(todosTable);
    return todo;
}

async function createTodo(todo: string) {

    const [result] = await db
        .insert(todosTable)
        .values({ todo })
        .returning({ id: todosTable.id });

    if (!result) throw new Error("Failed to create todo");

    return result.id;
}
async function deleteTodoById(id: number) {
    await db.delete(todosTable).where(eq(todosTable.id, id));
}

async function searchTodo(search: string) {
    const todo = await db.select().from(todosTable).where(ilike(todosTable.todo, `%${search}%`));
    return todo;
}

const tools = {
    getAllTodos: getAllTodos,
    createTodo: createTodo,
    deleteTodoById: deleteTodoById,
    searchTodo: searchTodo
}

const System_Prompt = `
You are a To-do List Assistant with START, PLAN, OBSERVATION and OUTPUT State.
Wait for the user prompt and first PLAN using available tools.
After Planning, Take Actions with appropriate tools and  wait dor OBSERVATION based the actions.
Once you get the observation, resturn the AI response based on Start Prompt and observations.

You can manage tasks by adding,viewing, deleting, and searching for tasks in the database.
You must strictly follow the JSON output format.
IMPORTANT:
Return exactly ONE JSON object per response.
Do not return multiple JSON objects or markdown.

Todo DB schema:
id: Int and primary key
todo: String and not null
createdAt: Timestamp and default to now
updatedAt: Timestamp and default to now

Available commands:
-getAllTodos: Return all the Todos from database
-createTodo: Create a new Todo. You will be given the task description and returns the ID of the newly created to-do.
-deleteTodoById: Delete a Todo by its ID. You will be given the ID of the task to delete.
-searchTodo: Search for all Todos matching the search string using ilike operator. You will be given a search string.

EXAMPLE

Conversation Flow

User → {"type":"user","user":"Add a new task to buy groceries."}
Assistant → {"type":"plan","plan":"I need the grocery items before creating the todo."}
Assistant → {"type":"output","output":"Sure! What grocery items would you like me to add?"}
User → {"type":"user","user":"Milk, Kurkure, and Diet Coke."}
Assistant → {"type":"plan","plan":"I have the required information. I will create a new todo."}
Assistant → {"type":"action","function":"createTodo","input":"Shopping list: Milk, Kurkure, and Diet Coke."}
System → {"type":"observation","observation":"id=2"}
Assistant → {"type":"output","output":"Done! Your shopping list has been added successfully (ID: 2)."}

IMPORTANT RULES

- Return exactly ONE JSON object per response.
- Never return multiple JSON objects in a single response.
- Do not use Markdown or code fences.
- Valid response types are: plan, action, and output.
- Observation messages are provided by the system after a tool executes.
`

const message = [{ role: "system", content: System_Prompt }];

while (true) {
    const query = readlineSync.question("User: ");

    const userMessage = {
        type: "user",
        user: query,
    };

    message.push({
        role: "user",
        content: JSON.stringify(userMessage),
    });

    while (true) {
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: message
                .filter((m) => m.role !== "system")
                .map((m) => ({
                    role: m.role === "assistant" ? "model" : "user",
                    parts: [{ text: m.content }],
                })),
            config: {
                systemInstruction: System_Prompt,
                responseMimeType: "application/json",
            },
        });

        const result = response.text!;
        // Gemini sometimes returns multiple JSON objects
        const json = `[${result}]`;
        const actions = JSON.parse(json);

        message.push({
            role: "assistant",
            content: result,
        });

        for (const action of actions) {

            if (action.type === "plan") {
                message.push({
                    role: "user",
                    content: JSON.stringify(action),
                });
                continue;
            }

            if (action.type === "output") {
                console.log(`AI: ${action.output}`);
                break;
            }
            if (action.type === "action") {
                let observation;

                switch (action.function) {
                    case "getAllTodos":
                        observation = await getAllTodos();
                        break;
                    case "createTodo":
                        observation = await createTodo(action.input);
                        break;
                    case "deleteTodoById":
                        observation = await deleteTodoById(action.input);
                        break;
                    case "searchTodo":
                        observation = await searchTodo(action.input);
                        break;
                }

                message.push({
                    role: "user",
                    content: JSON.stringify({
                        type: "observation",
                        observation,
                    }),
                });
            }
        }
    }
}
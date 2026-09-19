import { db } from "./src/db/index.js";
import { todosTable } from "./src/db/schema.js";
import { ilike, eq } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";
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

EXAMPLE:
START
{"type":"user","user":"Add a new task to buy groceries."}
{"type":"plan","plan": "I will create a new Todo with the description 'buy groceries'."}
{"type":"output","output":"CAn you tell me what all items you want to buy groceries for?"}
{"type":"user","user":"I want to buy milk, kurkure, and Diet Coke."}
{"type":"plan","plan": "I will use createTodo tool to add a new task with the description 'buy groceries'. in DB"}
{"type":"action","funtion":"createTodo","input": "Shopping list: milk, kurkure, and Diet Coke."}
{"type":"observation","observation":"id=2"}
{"type":"output","output":"The task 'buy groceries' has been added to your to-do list."}
`

const message = [{ role: "system", content: System_Prompt }];

while (true) {
    const query = readlineSync.question("User: "); //Let progra stop for user input in terminal 
    const userMessage = { type: "user", content: query };
    message.push({ role: "user", content: JSON.stringify(userMessage) });

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",


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

    message.push({
        role: "assistant",
        content: result,
    });

    const action=JSON.parse(result);

    if(action.type==="output"){
        console.log(`AI: ${action.output}`);
        break;
    }
    // console.log("AI:", result);
}
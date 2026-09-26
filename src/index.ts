const ui = {
    reset: "\x1b[0m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    magenta: "\x1b[35m",
    gray: "\x1b[90m",
    bold: "\x1b[1m",
};

console.clear();
console.log(`${ui.magenta}${ui.bold}
╔══════════════════════════════════════╗
║        🤖 AI TO-DO ASSISTANT        ║
╚══════════════════════════════════════╝
${ui.reset}`);


import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { db } from "./db/index.js";
import { todosTable } from "./db/schema.js";
import { ilike, eq, gte, lt, and } from "drizzle-orm";
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

async function createTodo(
    todo: string,
    priority: "high" | "medium" | "low",
    dueDate: Date
) {
    const [result] = await db
        .insert(todosTable)
        .values({
            todo,
            priority,
            dueDate,
        })
        .returning({
            id: todosTable.id,
        });

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

async function getTodosByDate(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return await db
        .select()
        .from(todosTable)
        .where(
            and(
                gte(todosTable.dueDate, start),
                lt(todosTable.dueDate, end)
            )
        );
}

async function rescheduleTodo(id: number, newDate: Date) {
    await db
        .update(todosTable)
        .set({
            dueDate: newDate,
        })
        .where(eq(todosTable.id, id));

    return `Todo ${id} rescheduled`;
}

const tools = {
    getAllTodos,
    createTodo,
    deleteTodoById,
    searchTodo,
    getTodosByDate,
    rescheduleTodo,
};

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
id: Int
todo: String
priority: high | medium | low
dueDate: ISO datetime
createdAt: Timestamp
updatedAt: Timestamp

Available commands:
-getAllTodos: Return all the Todos from database
-createTodo: Creates a new todo.
  Input format:
  {
    "todo": "Study DSA",
    "priority": "high",
    "dueDate": "2026-09-27T19:00:00"
  }
-deleteTodoById: Delete a Todo by its ID. You will be given the ID of the task to delete.
-searchTodo: Search for all Todos matching the search string using ilike operator. You will be given a search string.
- getTodosByDate:
  Returns all todos for a specific date.
  Input:
  {
    "date": "2026-09-27T00:00:00"
  }
    - rescheduleTodo:
  Moves a todo to a new date and time.

  Input:
  {
    "id": 8,
    "newDate": "2026-09-28T19:00:00"
  }

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
- A maximum of 5 tasks is allowed per day.
- Before creating a new todo with a dueDate, use getTodosByDate to check that day's schedule.
- If there are already 5 or more tasks, do NOT call rescheduleTodo immediately.
- Instead, recommend moving the lowest-priority task to the next available day and ask the user for confirmation.
- Only call rescheduleTodo after the user explicitly says "yes".
`

const message = [{ role: "system", content: System_Prompt }];

while (true) {
    const query = readlineSync.question(
        `${ui.cyan}${ui.bold} You:${ui.reset} `
    );
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
        // console.log("RAW:\n", result);
        const json = `[${result.trim().replace(/}\s*{/g, "},{")}]`;
        const actions = JSON.parse(json);

        message.push({
            role: "assistant",
            content: result,
        });

        let finished = false;
        for (const action of actions) {

            if (action.type === "plan") {
                console.log(
                    `${ui.yellow}🧠 Planning:${ui.reset} ${action.plan}`
                );

                message.push({
                    role: "user",
                    content: JSON.stringify(action),
                });

                continue;
            }

            if (action.type === "output") {
                console.log(
                    `\n${ui.green}${ui.bold}🤖 AI:${ui.reset} ${action.output}\n`
                );
                finished = true;
                break;
            }
            if (action.type === "action") {
                console.log(
                    `${ui.gray}⚙️  Executing:${ui.reset} ${action.function}`
                );
                let observation;

                switch (action.function) {
                    case "getAllTodos":
                        observation = await getAllTodos();
                        break;
                    case "createTodo":
                        observation = await createTodo(
                            action.input.todo,
                            action.input.priority,
                            new Date(action.input.dueDate)
                        );
                        break;
                    case "deleteTodoById":
                        observation = await deleteTodoById(action.input);
                        break;
                    case "searchTodo":
                        observation = await searchTodo(action.input);
                        break;
                    case "getTodosByDate":
                        observation = await getTodosByDate(
                            new Date(action.input.date)
                        );
                        break;
                    case "rescheduleTodo":
                        observation = await rescheduleTodo(
                            action.input.id,
                            new Date(action.input.newDate)
                        );
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
        if (finished) {
            break;
        }
    }
}
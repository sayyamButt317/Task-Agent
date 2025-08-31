import { ilike } from "drizzle-orm";
import { db } from "./db/index.js";
import { usersTable } from "./db/schema.js";
import OpenAI from "openai";
import readlineSync  from "readline-sync";
import dotenv from 'dotenv';

dotenv.config();
const client = new OpenAI();

async function getAllTodos() {
  const todo = await db.select().from(usersTable);
  return todo;
}

async function createTodo(todo) {
  const [result] = await db.insert(usersTable).values({ todo }).returning({
    id: usersTable.id,
  });
  return result.id;
}

async function searchTodo(search) {
  const todos = await db.select().from(usersTable).where(ilike(usersTable.todo, `%${search}%`));
  return todos;
}

async function deleteTodo(id) {
  await db.delete(usersTable).where(eq(usersTable.id, id));
}


const tools = {
  getAllTodos: getAllTodos,
  createTodo: createTodo,
  searchTodo: searchTodo,
  deleteTodo: deleteTodo, 
};


const SYSTEM_PROMPT = `

You are AI To-Do List Assistant with START, PLAN, ACTION ,Observation and Output State.
Wait for the user prompt and first PLAN using vailable tools.
After Planning, Take the action with appropiate tools and wait for observation based on Action.
Once you get the observations, Return the AI response based on START propmt and observations

You can manage tasks by adding ,viewing ,update and delete them
You must strictly follow the JSON output format.

Todo DB Schema:
id:Int and Primary Key
todo:string
created_at: Date Time
updated_at: Date Time

Available Tools:
- getAllTodos(): Returns all the Todos from Database
- createTodo(todo:string): Creates a new Todo in the DB and takes todo as a string and returns the ID of the created todo
- searchTodo(id:string): Deleted the todo by ID given in the DB
- deleteTodo(): Searches for all todos matching the query string using ilike in db

Example :
START
{"type": "user", "user": "Add a task for shopping groceries."}
{"type": "plan","plan": "I will try to get more context on what user needs to shop."}
{"type": "output","output": "Can you tell me what all items you want to shop for?"}
{"type": "user","user": "I want to shop for milk ,kurkure and choco"}
{"type": "plan","plan": "I will use createTodo to create a new Todo in DB."}
{"type": "action","function": "addTask", "input":"Shopping for milk, kurkure and choco"}
{"type": "observation","onservation":"2"}
{"type": "output", "output": "Your todo has been added successfully"}

`;

const message = [{ role: "system", content: SYSTEM_PROMPT }];

while (true) {
  const query = readlineSync.question(`>> `);
  const userMessage = {
    type: "user",
    user: query,
  };
  message.push({ role: "user", content: JSON.stringify(userMessage) });
  while (true) {
    const chat = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: message,
      response_format: { type: "json_object" },
    });
    const result = chat.choices[0].message.content;
    message.push({ role: "assistant", content: result });

    console.log(`\n\n------------------------ STARTAI ---------------------------`);
    console.log(JSON.parse(result));
    console.log(`------------------------ END AI ---------------------------\n\n`);

    const action = JSON.parse(result)

    if (action.type === "output") {
      console.log(`🤖: ${action.output}`);
      break;
    } else if(action.type === "action"){
        const fn = tools[action.function];
        if(!fn) throw new Error('Invalid Tool call')

          const observation =await fn(action.input) 
            const observationMessage={
                type: "observation",
                observation,
            };
            message.push({role:'developer',content:JSON.stringify(observationMessage)});
    }
  }
}

// borrar_todos.js
import axios from "axios";

async function borrarTodo() {
  try {
    const res = await api.delete("http://localhost:3001/products/delete-all");
    console.log("Productos eliminados:", res.data);
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}

borrarTodo();

// State
let tasks = [];
let isEditing = false;
let editingId = null;

// DOM Elements
const taskForm = document.getElementById("task-form");
const taskListContainer = document.getElementById("task-list-container");
const taskCountBadge = document.getElementById("task-count");
const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("add-task-btn");
const cancelBtn = document.getElementById("cancel-btn");
const themeToggle = document.getElementById("theme-toggle");
const display = document.getElementById("message-display");
const generateBtn = document.getElementById("generate-btn");

// ================= INITIALIZATION =================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Load Theme
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);

    // 2. Mock Data (Optional - remove for production)
    // tasks.push(createTask({name: "Math HW", hoursTotal: 2, dueDate: "2026-02-15", gradePercent: 10, effort: "heavy"}));

    renderTaskList();
});

// ================= EVENT LISTENERS =================

// Add / Update Task
submitBtn.addEventListener("click", (e) => {
    e.preventDefault(); // Prevent form submission

    // 1. Read & Validate
    const rawInput = readTaskInputs();
    const validation = validateTaskInputs(rawInput);

    if (!validation.ok) {
        showMessage(validation.errorMessage, "error");
        return;
    }

    if (isEditing) {
        // UPDATE existing task
        updateTask(editingId, validation);
        showMessage("Task updated successfully.", "success");
    } else {
        // CREATE new task
        const newTask = createTask(validation);
        tasks.push(newTask);
        showMessage("Task added to list.", "success");
    }

    // 2. Render & Cleanup
    renderTaskList();
    resetForm();
});

// Cancel Edit
cancelBtn.addEventListener("click", resetForm);

// Toggle Theme
themeToggle.addEventListener("click", () => {
    const html = document.documentElement;
    const current = html.getAttribute("data-theme");
    const next = current === "light" ? "dark" : "light";

    html.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
});

// Generate Schedule (Stub)
generateBtn.addEventListener("click", () => {
    if (tasks.length === 0) {
        showMessage("Please add tasks before generating a schedule.", "error");
        return;
    }
    showMessage(
        `Generating schedule for ${tasks.length} tasks... (Check Console)`,
        "success",
    );

    // Logic from previous version would go here
    const schedule = createEmptySchedule("2026-02-02");
    // naive allocation for demo
    tasks.forEach((t, i) => {
        tryAddBlock(schedule, i % 7, {
            taskId: t.id,
            taskName: t.name,
            hoursPlanned: Math.min(2, t.hoursRemaining),
        });
    });
    console.log("Generated Schedule:", schedule);
});

// ================= CRUD FUNCTIONS =================

function renderTaskList() {
    // Clear list
    taskListContainer.innerHTML = "";
    taskCountBadge.textContent = tasks.length;

    if (tasks.length === 0) {
        taskListContainer.innerHTML = `
            <div class="empty-state">
                <p>No tasks yet. Add one to get started!</p>
            </div>`;
        return;
    }

    // Render items
    tasks.forEach((task) => {
        const item = document.createElement("div");
        item.className = "task-item";
        item.innerHTML = `
            <div class="task-info">
                <h4>${task.name}</h4>
                <div class="task-meta">
                    <span>${task.hoursTotal}h • Due: ${task.dueDate}</span>
                    <span class="task-tag ${task.effort}">${task.effort.toUpperCase()}</span>
                </div>
            </div>
            <div class="task-actions">
                <button class="action-btn edit" onclick="startEdit('${task.id}')" title="Edit">✎</button>
                <button class="action-btn delete" onclick="deleteTask('${task.id}')" title="Delete">🗑</button>
            </div>
        `;
        taskListContainer.appendChild(item);
    });
}

// Global scope needed for onclick events in HTML strings
window.deleteTask = function (id) {
    if (confirm("Are you sure you want to delete this task?")) {
        tasks = tasks.filter((t) => t.id !== id);
        renderTaskList();
        // If we deleted the item currently being edited, reset form
        if (isEditing && editingId === id) resetForm();
        showMessage("Task deleted.", "success");
    }
};

window.startEdit = function (id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    // Set State
    isEditing = true;
    editingId = id;

    // Update UI
    formTitle.textContent = "Edit Task";
    submitBtn.innerHTML = "Save Changes";
    submitBtn.classList.remove("primary-btn");
    submitBtn.classList.add("accent-btn");
    cancelBtn.classList.remove("hidden");

    // Populate Form
    document.getElementById("task-name").value = task.name;
    document.getElementById("task-dueDate").value = task.dueDate;
    document.getElementById("task-hoursTotal").value = task.hoursTotal;
    document.getElementById("task-gradePercent").value = task.gradePercent;
    document.getElementById("task-effort").value = task.effort;
};

function updateTask(id, validData) {
    const index = tasks.findIndex((t) => t.id === id);
    if (index !== -1) {
        // preserve ID, update fields
        tasks[index] = {
            ...tasks[index],
            name: validData.name,
            dueDate: validData.dueDate,
            hoursTotal: validData.hoursTotal,
            gradePercent: validData.gradePercent,
            effort: validData.effort,
        };
    }
}

function resetForm() {
    isEditing = false;
    editingId = null;
    taskForm.reset();

    // Reset UI
    formTitle.textContent = "Add New Task";
    submitBtn.innerHTML = '<span class="plus-icon">+</span> Add Task';
    submitBtn.classList.add("primary-btn");
    submitBtn.classList.remove("accent-btn");
    cancelBtn.classList.add("hidden");
}

// ================= HELPERS & VALIDATION =================

function readTaskInputs() {
    return {
        name: document.getElementById("task-name").value,
        hoursTotal: document.getElementById("task-hoursTotal").value,
        gradePercent: document.getElementById("task-gradePercent").value,
        effort: document.getElementById("task-effort").value,
        dueDate: document.getElementById("task-dueDate").value,
    };
}

function validateTaskInputs(input) {
    const name = input.name.trim();
    const dueDate = input.dueDate.trim();
    const effort = input.effort.trim().toLowerCase();
    const hoursTotal = Number(input.hoursTotal);
    const gradePercent = Number(input.gradePercent);

    if (name.length === 0)
        return { ok: false, errorMessage: "Task name required." };
    if (dueDate.length === 0)
        return { ok: false, errorMessage: "Due date required." };
    if (Number.isNaN(hoursTotal) || hoursTotal <= 0)
        return { ok: false, errorMessage: "Hours must be > 0." };
    if (Number.isNaN(gradePercent) || gradePercent < 0 || gradePercent > 100)
        return { ok: false, errorMessage: "Weight must be 0-100." };

    return { ok: true, name, dueDate, hoursTotal, gradePercent, effort };
}

function createTask(data) {
    return {
        id: "t" + Date.now(), // simple unique ID using timestamp
        name: data.name,
        gradePercent: data.gradePercent,
        dueDate: data.dueDate,
        hoursTotal: data.hoursTotal,
        hoursRemaining: data.hoursTotal,
        effort: data.effort,
    };
}

function showMessage(msg, type) {
    display.textContent = msg;
    display.style.color = type === "error" ? "var(--danger)" : "var(--accent)";
    setTimeout(() => {
        display.textContent = "";
    }, 3000);
}

// ================= PREVIOUS SCHEDULE LOGIC (Minified) =================
function createEmptySchedule(todayDate) {
    const startDate = new Date(todayDate);
    const schedule = { startDate: todayDate, days: [] };
    for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        schedule.days.push({ date: d.toISOString().split("T")[0], blocks: [] });
    }
    return schedule;
}
function tryAddBlock(schedule, dayIndex, block) {
    const day = schedule.days[dayIndex];
    if (day.blocks.length >= 2) return false;
    day.blocks.push(block);
    return true;
}

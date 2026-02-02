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
const scheduleResult = document.getElementById("schedule-result");
const scheduleDisplayArea = document.getElementById("schedule-display-area");
const availInputs = document.querySelectorAll(".avail-input");

// ================= INITIALIZATION =================
document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    renderTaskList();
});

// ================= EVENT LISTENERS =================

submitBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const rawInput = readTaskInputs();
    const validation = validateTaskInputs(rawInput);

    if (!validation.ok) {
        showMessage(validation.errorMessage, "error");
        return;
    }

    if (isEditing) {
        updateTask(editingId, validation);
        showMessage("Task updated successfully.", "success");
    } else {
        const newTask = createTask(validation);
        tasks.push(newTask);
        showMessage("Task added to list.", "success");
    }

    renderTaskList();
    resetForm();
});

cancelBtn.addEventListener("click", resetForm);

themeToggle.addEventListener("click", () => {
    const html = document.documentElement;
    const current = html.getAttribute("data-theme");
    const next = current === "light" ? "dark" : "light";
    html.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
});

// ================= SCHEDULE GENERATION =================

generateBtn.addEventListener("click", () => {
    if (tasks.length === 0) {
        showMessage("Please add tasks before generating.", "error");
        return;
    }

    showMessage("Generating schedule...", "success");

    // 1. Get real time context
    const today = new Date();
    const daysMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // 2. Read Availability Pattern
    // returns array [SunHrs, MonHrs, ... SatHrs]
    const baseAvailability = Array.from(availInputs).map(
        (input) => Number(input.value) || 0,
    );

    // 3. Create 7-day projection starting Today
    // If today is Tuesday (2), we want the array to start at index 2
    let projectedAvailability = [];
    let startDayIndex = today.getDay(); // 0-6

    for (let i = 0; i < 7; i++) {
        let pointer = (startDayIndex + i) % 7;
        projectedAvailability.push(baseAvailability[pointer]);
    }

    console.log("Starting Generation Logic...");
    console.log("Tasks:", tasks);
    console.log("Base Availability (Sun-Sat):", baseAvailability);
    console.log("Projected Availability (Next 7 days):", projectedAvailability);

    // 4. Calculations
    const totalHoursNeeded = tasks.reduce((sum, t) => sum + t.hoursTotal, 0);
    const totalHoursAvailable = projectedAvailability.reduce(
        (a, b) => a + b,
        0,
    );
    const isFeasible = totalHoursAvailable >= totalHoursNeeded;
    const statusText = isFeasible ? "Feasible" : "Tight Schedule";
    const statusClass = isFeasible ? "ok" : "warn";

    // 5. Build HTML Output
    let htmlContent = "";

    // A. Summary Dashboard
    htmlContent += `
        <div class="summary-stats">
            <div class="stat-item">
                <span class="stat-label">Total Work</span>
                <span class="stat-value">${totalHoursNeeded.toFixed(1)}h</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Available This Week</span>
                <span class="stat-value">${totalHoursAvailable.toFixed(1)}h</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Status</span>
                <span class="stat-value ${statusClass}">${statusText}</span>
            </div>
        </div>
        <h3 class="section-title">7-Day Schedule</h3>
    `;

    // B. Distribution Logic
    let currentTaskIndex = 0;
    let currentTaskRemaining = tasks.length > 0 ? tasks[0].hoursTotal : 0;

    for (let i = 0; i < 7; i++) {
        let d = new Date(today);
        d.setDate(today.getDate() + i);
        let dateStr = d.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
        });
        let dayName = daysMap[d.getDay()];
        let hoursAvailable = projectedAvailability[i];

        // Start Day Card
        htmlContent += `
            <div class="schedule-day">
                <div class="day-header">
                    <h4>${dayName} <span style="font-weight:400; font-size:0.9em; opacity:0.8;">${dateStr}</span></h4>
                    <span class="day-avail">${hoursAvailable}h avail</span>
                </div>
                <div class="day-tasks">
        `;

        if (hoursAvailable === 0) {
            htmlContent += `<div class="note-text">Rest Day (0 hours available)</div>`;
        } else {
            let hoursFilled = 0;
            let blocksAdded = 0;

            while (
                hoursFilled < hoursAvailable &&
                currentTaskIndex < tasks.length
            ) {
                let task = tasks[currentTaskIndex];
                let timeToSpend = Math.min(
                    hoursAvailable - hoursFilled,
                    currentTaskRemaining,
                );

                htmlContent += `
                    <div class="schedule-item">
                        <div class="task-info">
                            <h4>${task.name}</h4>
                            <span class="note-text">${currentTaskRemaining <= timeToSpend ? "(Finish)" : "(Continue)"}</span>
                        </div>
                        <div class="task-meta">
                            <span class="task-tag ${task.effort}">${timeToSpend.toFixed(1)}h</span>
                        </div>
                    </div>
                `;

                hoursFilled += timeToSpend;
                currentTaskRemaining -= timeToSpend;
                blocksAdded++;

                if (currentTaskRemaining <= 0.01) {
                    // Floating point safety
                    currentTaskIndex++;
                    if (currentTaskIndex < tasks.length) {
                        currentTaskRemaining =
                            tasks[currentTaskIndex].hoursTotal;
                    }
                }
            }

            if (blocksAdded === 0 && currentTaskIndex >= tasks.length) {
                htmlContent += `<div class="note-text">No tasks remaining!</div>`;
            }
        }

        htmlContent += `</div></div>`;
    }

    // C. Energy Options
    htmlContent += `<h3 class="section-title">Today's Options (Energy Based)</h3>`;
    const heavyTasks = tasks.filter((t) => t.effort === "heavy");
    const lightTasks = tasks.filter((t) => t.effort === "light");

    const generateOptionList = (label, taskList, fallbackMsg) => {
        let listHtml = `<div class="schedule-day" style="border-left-color:var(--border)"><div class="day-header"><h4>${label}</h4></div><div class="day-tasks">`;
        if (taskList.length > 0) {
            taskList.forEach((t) => {
                listHtml += `
                    <div class="schedule-item">
                        <div class="task-info"><h4>${t.name}</h4></div>
                        <div class="task-meta"><span class="task-tag ${t.effort}">${t.hoursTotal}h total</span></div>
                    </div>`;
            });
        } else {
            listHtml += `<div class="note-text">${fallbackMsg}</div>`;
        }
        return listHtml + `</div></div>`;
    };

    htmlContent += generateOptionList(
        "Low Energy Mode",
        lightTasks,
        "No light tasks available.",
    );
    htmlContent += generateOptionList(
        "High Energy Mode",
        heavyTasks,
        "No heavy tasks available.",
    );

    scheduleDisplayArea.innerHTML = htmlContent;
    scheduleResult.classList.remove("hidden");
    scheduleResult.scrollIntoView({ behavior: "smooth" });
});

// ================= HELPER FUNCTIONS =================

function renderTaskList() {
    taskListContainer.innerHTML = "";
    taskCountBadge.textContent = tasks.length;

    if (tasks.length === 0) {
        taskListContainer.innerHTML = `
            <div class="empty-state">
                <p>No tasks yet. Add one to get started!</p>
            </div>`;
        return;
    }

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

window.deleteTask = function (id) {
    if (confirm("Are you sure you want to delete this task?")) {
        tasks = tasks.filter((t) => t.id !== id);
        renderTaskList();
        if (isEditing && editingId === id) resetForm();
        showMessage("Task deleted.", "success");
    }
};

window.startEdit = function (id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    isEditing = true;
    editingId = id;

    formTitle.textContent = "Edit Task";
    submitBtn.innerHTML = "Save Changes";
    submitBtn.classList.remove("primary-btn");
    submitBtn.classList.add("accent-btn");
    cancelBtn.classList.remove("hidden");

    document.getElementById("task-name").value = task.name;
    document.getElementById("task-dueDate").value = task.dueDate;
    document.getElementById("task-hoursTotal").value = task.hoursTotal;
    document.getElementById("task-gradePercent").value = task.gradePercent;
    document.getElementById("task-effort").value = task.effort;
};

function updateTask(id, validData) {
    const index = tasks.findIndex((t) => t.id === id);
    if (index !== -1) {
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
    formTitle.textContent = "Add New Task";
    submitBtn.innerHTML = '<span class="plus-icon">+</span> Add Task';
    submitBtn.classList.add("primary-btn");
    submitBtn.classList.remove("accent-btn");
    cancelBtn.classList.add("hidden");
}

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
        id: "t" + Date.now(),
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

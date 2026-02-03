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
const debugBtn = document.getElementById("debug-btn");

// Constants
const MAX_HOURS_PER_DAY = 5;
const MAX_TASKS_PER_DAY = 2;

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

// DEBUG BUTTON: Real-world Test Cases
debugBtn.addEventListener("click", () => {
    // 1. Set Mixed Availability
    const weekAvail = [0, 4, 3, 2, 8, 1, 5]; 
    availInputs.forEach((input, i) => {
        input.value = weekAvail[i];
    });

    // 2. Helper to get date string
    const getFutureDate = (days) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().split("T")[0];
    };

    // 3. Test Cases for Algorithm
    tasks = [
        // CASE A: The "Due Tomorrow" Crisis
        { 
            id: "t1", 
            name: "Urgent Lab Report", 
            hoursTotal: 2, 
            gradePercent: 50, 
            dueDate: getFutureDate(1), 
            effort: "heavy" 
        },
        // CASE B: The "Long Haul"
        { 
            id: "t2", 
            name: "Semester Project", 
            hoursTotal: 12, 
            gradePercent: 30, 
            dueDate: getFutureDate(6), 
            effort: "heavy" 
        },
        // CASE C: "Quick Win"
        { 
            id: "t3", 
            name: "Email Professor", 
            hoursTotal: 0.5, 
            gradePercent: 5, 
            dueDate: getFutureDate(3), 
            effort: "light" 
        },
        // CASE D: "The Distraction" - 0% Weight!
        { 
            id: "t4", 
            name: "Optional Reading", 
            hoursTotal: 2, 
            gradePercent: 0, 
            dueDate: getFutureDate(4), 
            effort: "light" 
        }
    ];

    renderTaskList();
    showMessage("Loaded test data.", "success");
});

// ================= SCHEDULE GENERATION =================

generateBtn.addEventListener("click", () => {
    if (tasks.length === 0) {
        showMessage("Please add tasks before generating.", "error");
        return;
    }

    showMessage("Generating schedule...", "success");

    // 1. Setup Time Context
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const daysMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // 2. Get User Availability (Applied Global Cap)
    const baseAvailability = Array.from(availInputs).map(
        (input) => {
            const userVal = Number(input.value) || 0;
            return Math.min(userVal, MAX_HOURS_PER_DAY);
        }
    );

    // 3. Create Sim Tasks
    let simTasks = tasks.map(t => ({
        ...t,
        remaining: t.hoursTotal,
        dueDateObj: new Date(t.dueDate + 'T00:00:00') 
    }));

    // 4. Build 7-Day Schedule
    let htmlContent = "";
    let weeklyOutput = [];
    let startDayIndex = today.getDay(); // 0-6

    let totalScheduledHours = 0;
    
    for (let i = 0; i < 7; i++) {
        let currentDayDate = new Date(today);
        currentDayDate.setDate(today.getDate() + i);
        
        let dayOfWeekIndex = (startDayIndex + i) % 7;
        let dailyCap = baseAvailability[dayOfWeekIndex];
        
        let hoursUsedToday = 0;
        let tasksAssignedToday = 0;
        let dayAssignments = [];

        // --- SCHEDULING ALGORITHM ---
        
        let candidates = simTasks.filter(t => t.remaining > 0 && t.dueDateObj >= currentDayDate);

        // Score = Weight * (1 / DaysUntilDue)
        candidates.forEach(t => {
            let diffTime = t.dueDateObj - currentDayDate;
            let daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            if (daysUntil <= 0) daysUntil = 0.5;
            
            // Weight is guaranteed to be a number >= 0 due to validation
            let weight = t.gradePercent;
            
            t.priorityScore = weight / daysUntil;
        });

        candidates.sort((a, b) => b.priorityScore - a.priorityScore);

        for (let task of candidates) {
            if (tasksAssignedToday >= MAX_TASKS_PER_DAY) break;
            if (hoursUsedToday >= dailyCap) break;

            let spaceInDay = dailyCap - hoursUsedToday;
            let alloc = Math.min(task.remaining, spaceInDay);

            if (alloc > 0) {
                dayAssignments.push({
                    name: task.name,
                    hours: alloc,
                    effort: task.effort,
                    isFinish: (task.remaining - alloc) <= 0.01
                });

                task.remaining -= alloc;
                hoursUsedToday += alloc;
                totalScheduledHours += alloc;
                tasksAssignedToday++;
            }
        }

        weeklyOutput.push({
            dateStr: currentDayDate.toLocaleDateString(undefined, {month:'short', day:'numeric'}),
            dayName: daysMap[dayOfWeekIndex],
            cap: dailyCap,
            assignments: dayAssignments
        });
    }

    // 5. Build HTML Output with 3-State Logic
    const totalNeeded = tasks.reduce((acc, t) => acc + t.hoursTotal, 0);
    const totalAvailableCapacity = weeklyOutput.reduce((acc, day) => acc + day.cap, 0);
    
    let statusText, statusClass;

    if (totalScheduledHours < (totalNeeded - 0.1)) {
        statusText = "Overloaded";
        statusClass = "danger"; 
    } else {
        const utilization = totalAvailableCapacity > 0 ? (totalScheduledHours / totalAvailableCapacity) : 1;
        
        if (utilization > 0.85) {
            statusText = "Tight Schedule";
            statusClass = "warn";
        } else {
            statusText = "Achievable";
            statusClass = "ok";
        }
    }

    htmlContent += `
        <div class="summary-stats">
            <div class="stat-item">
                <span class="stat-label">Total Work</span>
                <span class="stat-value">${totalNeeded.toFixed(1)}h</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Scheduled</span>
                <span class="stat-value">${totalScheduledHours.toFixed(1)}h</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Status</span>
                <span class="stat-value ${statusClass}">${statusText}</span>
            </div>
        </div>
        <h3 class="section-title">7-Day Plan (Max 5h/day)</h3>
    `;

    weeklyOutput.forEach(day => {
        htmlContent += `
            <div class="schedule-day">
                <div class="day-header">
                    <h4>${day.dayName} <span style="font-weight:400; font-size:0.9em; opacity:0.8;">${day.dateStr}</span></h4>
                    <span class="day-avail">${day.cap}h Limit</span>
                </div>
                <div class="day-tasks">
        `;

        if (day.cap === 0) {
            htmlContent += `<div class="note-text">Rest Day</div>`;
        } else if (day.assignments.length === 0) {
             if (totalScheduledHours >= totalNeeded) {
                 htmlContent += `<div class="note-text" style="color:var(--accent)">Caught up! Free time.</div>`;
             } else {
                 htmlContent += `<div class="note-text">No urgent tasks fit today.</div>`;
             }
        } else {
            day.assignments.forEach(item => {
                htmlContent += `
                    <div class="schedule-item">
                        <div class="task-info">
                            <h4>${item.name}</h4>
                            <span class="note-text">${item.isFinish ? "✅ Finish this" : "👉 Work on this"}</span>
                        </div>
                        <div class="task-meta">
                            <span class="task-tag ${item.effort}">${item.hours.toFixed(1)}h</span>
                        </div>
                    </div>
                `;
            });
        }
        htmlContent += `</div></div>`;
    });

    // 6. Energy Options
    htmlContent += `<h3 class="section-title">Today's Best Options</h3>`;
    
    const getBestTask = (effortType) => {
        let options = tasks.filter(t => t.effort === effortType);
        if (options.length === 0) return null;

        options.sort((a, b) => {
            let da = (new Date(a.dueDate) - new Date()) / (1000 * 60 * 60 * 24);
            let db = (new Date(b.dueDate) - new Date()) / (1000 * 60 * 60 * 24);
            if(da < 0.1) da = 0.1;
            if(db < 0.1) db = 0.1;
            
            let wa = a.gradePercent;
            let wb = b.gradePercent;
            
            let scoreA = wa / da;
            let scoreB = wb / db;
            return scoreB - scoreA;
        });

        return options[0];
    };

    const lightOption = getBestTask("light");
    const heavyOption = getBestTask("heavy");

    const renderOption = (label, task) => {
        if (!task) return `
            <div class="schedule-day" style="border-left-color: var(--border)">
                <div class="day-header"><h4>${label}</h4></div>
                <div class="note-text" style="padding-left:16px;">No tasks available.</div>
            </div>`;
        
        return `
            <div class="schedule-day" style="border-left-color: var(--border)">
                <div class="day-header"><h4>${label}</h4></div>
                <div class="day-tasks">
                    <div class="schedule-item" style="border-left: 4px solid var(--accent)">
                        <div class="task-info">
                            <h4>${task.name}</h4>
                            <span class="note-text">Top Priority</span>
                        </div>
                        <div class="task-meta">
                            <span class="priority-badge">Due ${task.dueDate}</span>
                        </div>
                    </div>
                </div>
            </div>`;
    };

    htmlContent += renderOption("Low Energy? Do this:", lightOption);
    htmlContent += renderOption("High Energy? Do this:", heavyOption);

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
    
    // Strict check for empty weight
    if (input.gradePercent.trim() === "") {
        return { ok: false, errorMessage: "Please enter a weight (0-100)." };
    }
    
    const gradePercent = Number(input.gradePercent);

    if (name.length === 0)
        return { ok: false, errorMessage: "Task name required." };
    if (dueDate.length === 0)
        return { ok: false, errorMessage: "Due date required." };
    if (Number.isNaN(hoursTotal) || hoursTotal <= 0)
        return { ok: false, errorMessage: "Hours must be > 0." };
    if (Number.isNaN(gradePercent) || gradePercent < 0 || gradePercent > 100)
        return { ok: false, errorMessage: "Weight must be 0-100." };
    
    // Date Check: Ensure due date is not in the past
    // Normalize today to midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parse input (YYYY-MM-DD) to avoid timezone issues
    const [y, m, d] = dueDate.split('-').map(Number);
    // Note: month is 0-indexed in JS Date
    const inputDate = new Date(y, m - 1, d);

    if (inputDate < today) {
        return { ok: false, errorMessage: "Please pick a date not before today." };
    }

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
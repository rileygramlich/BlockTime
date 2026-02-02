let nextTaskNumber = 1; // used for numbering the tasks

document.addEventListener("DOMContentLoaded", () => {
    // Select DOM elements
    const button = document.getElementById("hello-btn");
    const display = document.getElementById("message-display");

    // currently creates a task when the button is clicked
    button.addEventListener("click", () => {
       const input = readInputs();
       const inputValidation = validateInputs(input);

       // do not create a task if invalid inputs
       if (inputValidation.ok === false) {
        display.textContent = inputValidation.errorMessage;
        display.classList.add("visible");
        return;
       }

       const task = createTask(inputValidation);

       console.log(task)  
       display.textContent = "Created task " + task.id;
       display.classList.add("visible");
    });
});

//=================================== Task Creation + Validation ===================================

// reads inputs and returns strings
function readInputs() {
    const testName = document.getElementById("task-name");

    // Test data. Remove this once input fields are added
    if (testName === null) {
        return {
        name: "Math HW",
        hoursTotal: 5,
        gradePercent: 10,
        effort: "heavy",
        dueDate: "2026-2-1"
        };
    }

    return {
        name: document.getElementById("task-name").value,
        hoursTotal: document.getElementById("task-hoursTotal").value,
        gradePercent: document.getElementById("task-gradePercent").value,
        effort: document.getElementById("task-effort").value,
        dueDate: document.getElementById("task-dueDate").value
    };
}

// validates and normailizes
function validateInputs(input) {
    // makes the format for the strings consistent
    const name = input.name.trim();
    const dueDate = input.dueDate.trim();
    const effort = input.effort.trim().toLowerCase();
    
    // converts numeric strings to numbers
    const hoursTotal = Number(input.hoursTotal);
    const gradePercent = Number(input.gradePercent);

    if (name.length === 0) {
        return {ok: false, errorMessage: "Task name can't be empty."};
    }
    
    if (dueDate.length === 0) {
        return {ok: false, errorMessage: "Due date is missing"};
    }

    if (Number.isNaN(hoursTotal) || hoursTotal <= 0) {
        return {ok: false, errorMessage: "Total hours must be greater than 0."};
    }

    if (Number.isNaN(gradePercent) || gradePercent < 0 || gradePercent > 100) {
        return {ok: false, errorMessage: "Grade percent must be between 0 and 100"};
    }

    if (effort !== "light" && effort !== "heavy") {
        return {ok: false, errorMessage: "Effort must be light or heavy."}
    }

    return {
        ok: true,
        name: name,
        dueDate: dueDate,
        hoursTotal: hoursTotal,
        gradePercent: gradePercent,
        effort: effort
    };
}

/*
Task object structure
    - id: string    (t1, t2, t3, ...)
    - name: string  (name of the task)
    - gradePercent: number  (0-100)
    - dueDate: string   (YYYY-MM-DD)
    - hoursTotal: number    (estimate for how long this task will take to complete)
    - hoursRemaining: number    (remaining hours for this task)
    - effort: string    (light or heavy for if the user thinks a task is light or heavy)
*/
function createTask(task) {
    return {
        id: generateTaskId(),
        name: task.name,
        gradePercent: task.gradePercent,
        dueDate: task.dueDate,
        hoursTotal: task.hoursTotal,
        hoursRemaining: task.hoursTotal,
        effort: task.effort
    };

}

function generateTaskId() {
    const id = "t" + nextTaskNumber;
    nextTaskNumber += 1;
    return id;
}

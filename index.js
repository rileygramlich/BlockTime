let nextTaskNumber = 1; // used for numbering the tasks

document.addEventListener("DOMContentLoaded", () => {
    // Select DOM elements
    const button = document.getElementById("hello-btn");
    const display = document.getElementById("message-display");

    // currently creates a task when the button is clicked
    // this button is currently just being used for debugging
    button.addEventListener("click", () => {
       const taskInput = readTaskInputs();
       const taskInputValidation = validateTaskInputs(taskInput);

       // do not create a task if invalid inputs
       if (taskInputValidation.ok === false) {
        display.textContent = taskInputValidation.errorMessage;
        display.classList.add("visible");
        return;
       }

       // tests
       const task = createTask(taskInputValidation);
       console.log("Created task: ", task)  

       const schedule = createEmptySchedule("2026-02-11"); // TODO: replace with user today date input

       tryAddBlock(schedule, 0, {taskId: "t1", taskName: "Math HW", hoursPlanned: 2});
       tryAddBlock(schedule, 0, {taskId: "t2", taskName: "COMP HW", hoursPlanned: 2});

       const thirdAdd = tryAddBlock(schedule, 0, {taskId: "t3", taskName: "GNED HW", hoursPlanned: 2});
       console.log("Third add should be false", thirdAdd);
       console.log("Schedule:",schedule);

       display.textContent = "Created task " + task.id;
       display.classList.add("visible");
    });
});

//=================================== Task Creation + Validation ===================================

// reads inputs and returns strings
function readTaskInputs() {
    const testName = document.getElementById("task-name");

    // Test data. Remove this once input fields are added
    if (testName === null) {
        return {
        name: "Math HW",
        hoursTotal: 5,
        gradePercent: 10,
        effort: "heavy",
        dueDate: "2026-02-01"
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
function validateTaskInputs(input) {
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

//=================================== Schedule Object Structure ===================================

/*
Schedule Structure:
    - startDate: YYYY-MM-DD (user enters today's date)
    - days: 7 items
        - each day has a date and up to 2 blocks
        - each block: {taskId, taskName, hoursPlanned}
*/
function createEmptySchedule(todayDate) {
    const startDate = makeDate(todayDate);

    // final schedule
    const schedule = {
        startDate: todayDate,
        days: []
    };

    // build 7 days
    for(let i = 0; i < 7; i += 1) {
        const date = new Date(startDate); // copy of startDate so it doesn't get modified
        date.setDate(startDate.getDate() + i); // copied date moves forward i days

        // store the day in the schedule
        schedule.days.push({
            date: makeDateString(date),
            blocks: []
        });
    }

    return schedule;

}

/*
    parameters:
        - schedule: the schedule object returned by createEmptySchedule()
        - dayIndex: which day to add
        - block: the work block to add like:
            {taskId: "t1", taskName: "Math HW", hoursPlanned: 2}
    returns:
        - true if the block was added
        - false if the day already has 2 blocks 
*/

function tryAddBlock(schedule, dayIndex, block) {
    const day = schedule.days[dayIndex];

    if (day.blocks.length >= 2) {
        return false;
    }

    day.blocks.push(block);
    return true;
}

// breaks down the user-entered date into parts and creates a date object
// "YYYY-MM-DD" -> Date
function makeDate(dateString) {
    const parts = dateString.split("-");
    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1; // Jan is 0, Feb is 1, ...
    const day = Number(parts[2]);
    return new Date(year, month, day);
}

// takes the Date and turns it into a string
// Date -> "YYYY-MM-DD"
function makeDateString(date) {
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return (year + "-" + month + "-" + day);
}

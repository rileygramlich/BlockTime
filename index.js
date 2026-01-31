document.addEventListener("DOMContentLoaded", () => {
    // Select DOM elements
    const button = document.getElementById("hello-btn");
    const display = document.getElementById("message-display");

    // Event Listener
    button.addEventListener("click", () => {
        display.textContent = "Hello, World! System Online.";
        display.classList.add("visible");

        // Console log for debugging
        console.log("Button clicked. Message displayed.");
        
    });
});

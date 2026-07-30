// ======================================
// Student Random Selection System
// Version 3.0
// ======================================

// ======================================
// Helper Functions
// ======================================

function showLoading() {
    document.getElementById("loadingOverlay").classList.remove("hidden");
}

function hideLoading() {
    document.getElementById("loadingOverlay").classList.add("hidden");
}

function showToast(message, type = "success") {

    const toast = document.getElementById("toast");

    toast.innerText = message;

    toast.className = `toast ${type}`;

    toast.classList.remove("hidden");

    setTimeout(() => {
        toast.classList.add("hidden");
    }, 3000);

}

function enableGenerateButton() {
    document.getElementById("generateBtn").disabled = false;
}

function getSelectedColumns() {

    const selected = [];

    document
        .querySelectorAll("#columnSelection input[type='checkbox']:checked")
        .forEach(box => {
            selected.push(box.value);
        });

    return selected;

}


// ======================================
// Upload Dataset
// ======================================

// function uploadFile() {

//     const fileInput = document.getElementById("fileInput");

//     if (fileInput.files.length === 0) {

//         showToast("Please choose a file.", "error");

//         return;

//     }

//     showLoading();

//     const file = fileInput.files[0];

//     const formData = new FormData();

//     formData.append("file", file);

//     fetch("/upload", {

//         method: "POST",

//         body: formData

//     })

function uploadFile() {

    console.log("uploadFile() called");

    const fileInput = document.getElementById("fileInput");

    console.log("File input:", fileInput);
    console.log("Files:", fileInput.files);
    console.log("Files length:", fileInput.files.length);

    if (fileInput.files.length === 0) {

        console.log("No file selected");

        showToast("Please choose a file.", "error");

        return;

    }

    showLoading();

    console.log("Loading shown");

    const file = fileInput.files[0];

    console.log("Selected file:", file);

    const formData = new FormData();

    formData.append("file", file);

    console.log("About to send fetch request...");

    fetch("/upload", {

        method: "POST",

        body: formData

    })

    .then(response => response.json())

    .then(data => {

        hideLoading();

        if (!data.success) {

            showToast(data.message, "error");

            return;

        }

        // Upload Status

        document.getElementById("uploadStatus").innerHTML = `

            <strong>✅ ${data.filename}</strong>

            <br>

            ${data.message}

        `;

        // Summary

        document.getElementById("summaryFile").innerText =
            data.filename;

        document.getElementById("summaryRecords").innerText =
            data.records;

        document.getElementById("summaryColumns").innerText =
            data.columns.length;

        // Generate Button

        enableGenerateButton();

        // Dynamic Checkboxes

        const columnDiv =
            document.getElementById("columnSelection");

        columnDiv.innerHTML = "";

        data.columns.forEach(column => {

            columnDiv.innerHTML += `

                <label>

                    <input
                        type="checkbox"
                        value="${column}"
                        checked>

                    ${column}

                </label>

                <br>

            `;

        });

        showToast("Dataset uploaded successfully!");
        loadHistory();

    })

    .catch(error => {

        hideLoading();

        console.error(error);

        showToast("Upload failed.", "error");

    });

}



// ======================================
// Generate Random Students
// ======================================

function getRandom() {

    showLoading();

    const count =
        parseInt(document.getElementById("studentCount").value);

    fetch("/random", {

        method: "POST",

        headers: {

            "Content-Type": "application/json"

        },

        body: JSON.stringify({

            count: count,
            columns: getSelectedColumns()

        })

    })

    .then(response => response.json())

    .then(data => {

        hideLoading();

        const container =
            document.getElementById("studentContainer");

        container.innerHTML = "";

        if (!data.success) {

            container.innerHTML = `

                <div class="empty-state">

                    ${data.message}

                </div>

            `;

            showToast(data.message, "error");

            return;

        }

        const selectedColumns =
            getSelectedColumns();

        data.students.forEach((student, index) => {

            const card =
                document.createElement("div");

            card.className = "student-card";

            let content = `

                <h3>

                    🎓 Student ${index + 1}

                </h3>

            `;

            selectedColumns.forEach(column => {

                if (student[column] !== undefined) {

                    content += `

                        <p>

                            <strong>${column}</strong>

                            <br>

                            ${student[column]}

                        </p>

                    `;

                }

            });

            card.innerHTML = content;

            container.appendChild(card);

        });

        loadHistory();

        showToast("Students generated successfully!");

    })

    .catch(error => {

        hideLoading();

        console.error(error);

        showToast("Generation failed.", "error");

    });

}


// ======================================
// History
// ======================================

function loadHistory(){

    fetch("/history")

    .then(response=>response.json())

    .then(history=>{

        const container=document.getElementById("historyContainer");

        container.innerHTML="";

        if(history.length===0){

            container.innerHTML=`
                <div class="empty-state">
                    No history available.
                </div>
            `;

            return;

        }

        history.forEach(item=>{

            container.innerHTML+=`

                <div class="history-item">

                    <strong>${item.time}</strong>

                    <br>

                    File : ${item.filename}

                    <br>

                    Generated ${item.count} student(s)

                </div>

            `;

        });

    });

}

// ======================================
// Reset Dataset
// ======================================

function resetDataset(){

    fetch("/reset",{

        method:"POST"

    })

    .then(response=>response.json())

    .then(data=>{

        document.getElementById("studentContainer").innerHTML=`

            <div class="empty-state">

                Upload a dataset and generate students.

            </div>

        `;

        document.getElementById("historyContainer").innerHTML=`

            <div class="empty-state">

                No history available.

            </div>

        `;

        document.getElementById("summaryFile").innerText="-";

        document.getElementById("summaryRecords").innerText="0";

        document.getElementById("summaryColumns").innerText="0";

        document.getElementById("uploadStatus").innerHTML="";

        document.getElementById("columnSelection").innerHTML="";

        document.getElementById("generateBtn").disabled=true;

        document.getElementById("fileInput").value="";

        showToast(data.message);

    });

}

// ======================================
// Initial State
// ======================================

window.onload = function () {

    document.getElementById("generateBtn").disabled = true;
    loadHistory();
     document.getElementById("fileInput").addEventListener("change", uploadFile);

};
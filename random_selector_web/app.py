from flask import Flask, request, jsonify, render_template
import pandas as pd
import random
import pdfplumber
import docx
import os
import json
from datetime import datetime

app = Flask(__name__)
# =====================================
# History Configuration
# =====================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

HISTORY_FOLDER = os.path.join(BASE_DIR, "history")

HISTORY_FILE = os.path.join(HISTORY_FOLDER, "history.json")

os.makedirs(HISTORY_FOLDER, exist_ok=True)

if not os.path.exists(HISTORY_FILE):
    with open(HISTORY_FILE, "w") as file:
        json.dump([], file, indent=4)


# =====================================
# Dataset Manager
# =====================================

dataset = {
    "filename": "",
    "records": [],
    "columns": [],
    "record_count": 0
}


# =====================================
# Home Page
# =====================================
# =====================================
# Save History
# =====================================

def save_history(filename, count):

    with open(HISTORY_FILE, "r") as file:
        history = json.load(file)

    history.insert(0, {
        "filename": filename,
        "count": count,
        "time": datetime.now().strftime("%d-%m-%Y %I:%M:%S %p")
    })

    with open(HISTORY_FILE, "w") as file:
        json.dump(history, file, indent=4)

@app.route('/')
def home():
    return render_template("index.html")


# =====================================
# Upload Dataset
# =====================================

@app.route('/upload', methods=['POST'])
def upload_file():

    global dataset

    if 'file' not in request.files:
        return jsonify({
            "success": False,
            "message": "No file selected."
        })

    file = request.files['file']

    if file.filename == "":
        return jsonify({
            "success": False,
            "message": "Please select a file."
        })

    filename = file.filename.lower()

    # Reset previous dataset
    dataset["filename"] = ""
    dataset["records"] = []
    dataset["columns"] = []
    dataset["record_count"] = 0

    try:

        # ==========================
        # Excel
        # ==========================

        if filename.endswith(('.xlsx', '.xls')):

            df = pd.read_excel(file)
            dataset["records"] = df.fillna("").to_dict(orient="records")

        # ==========================
        # CSV
        # ==========================

        elif filename.endswith(".csv"):

            df = pd.read_csv(file)
            dataset["records"] = df.fillna("").to_dict(orient="records")

        # ==========================
        # PDF
        # ==========================
        

        elif filename.endswith(".pdf"):
        
            all_rows = []

            with pdfplumber.open(file) as pdf:
            
                for page in pdf.pages:
                
                    tables = page.extract_tables()

                    for table in tables:
                    
                        if not table:
                            continue
                        
                        for row in table:
                        
                            if not row:
                                continue
                            
                            row = [str(cell).strip() if cell else "" for cell in row]

                            all_rows.append(row)

            if len(all_rows) < 2:
            
                return jsonify({
                    "success": False,
                    "message": "No table found inside PDF."
                })

            header = all_rows[0]
            data = all_rows[1:]

            df = pd.DataFrame(data, columns=header)

            df = df.fillna("")

            dataset["records"] = df.to_dict(orient="records")

        # ==========================
        # DOCX
        # ==========================

        elif filename.endswith(".docx"):

            doc = docx.Document(file)

            paragraphs = [
                para.text
                for para in doc.paragraphs
                if para.text.strip()
            ]

            dataset["records"] = [

                {
                    "Paragraph": i + 1,
                    "Content": para
                }

                for i, para in enumerate(paragraphs)

            ]

        else:

            return jsonify({
                "success": False,
                "message": "Unsupported file format."
            })

        # ==========================
        # Store Dataset Details
        # ==========================

        if not dataset["records"]:
            return jsonify({
            "success": False,
            "message": "The uploaded file does not contain any valid records."
        })

        dataset["columns"] = list(dataset["records"][0].keys())
        dataset["filename"] = file.filename 
        dataset["record_count"] = len(dataset["records"]) 

        return jsonify({
            "success": True,
            "message": f"Loaded {dataset['record_count']} records successfully.",
            "filename": dataset["filename"],
            "records": dataset["record_count"],
            "columns": dataset["columns"]
        })

    except Exception as e:

        return jsonify({

            "success": False,
            "message": str(e)

        })


# =====================================
# Dataset Summary
# =====================================

@app.route("/summary")
def summary():

    return jsonify({

        "filename": dataset["filename"],
        "records": dataset["record_count"],
        "columns": dataset["columns"]

    })


# =====================================
# Reset Dataset
# =====================================

@app.route("/reset", methods=["POST"])
def reset():

    global dataset

    dataset = {

        "filename": "",
        "records": [],
        "columns": [],
        "record_count": 0

    }

    with open(HISTORY_FILE, "w") as file:
        json.dump([], file, indent=4)

    return jsonify({

        "success": True,
        "message": "Dataset cleared."

    })


# =====================================
# Generate Random Students
# =====================================

@app.route('/random', methods=['POST'])
def random_students():

    global dataset

    if dataset["record_count"] == 0:

        return jsonify({

            "success": False,
            "message": "Please upload a dataset first."

        })

    data = request.get_json()

    count = int(data.get("count", 1))

    selected_columns = data.get("columns", [])

    if count <= 0:

        return jsonify({
            "success": False,
            "message": "Student count must be greater than zero."
        })

    count = min(count, dataset["record_count"])
    
    selected_students = random.sample(dataset["records"], count)
    
    if selected_columns:
    
        filtered_students = []
    
        for student in selected_students:
        
            filtered = {}
    
            for column in selected_columns:
            
                filtered[column] = student.get(column, "")
    
            filtered_students.append(filtered)
    
    else:
    
        filtered_students = selected_students
    
    save_history(dataset["filename"], count)
    
    return jsonify({
    
        "success": True,
        "students": filtered_students
    
    })

# =====================================
# History API
# =====================================

@app.route("/history")
def history():

    with open(HISTORY_FILE, "r") as file:
        history = json.load(file)

    return jsonify(history)

# =====================================
# Run Application
# =====================================

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uuid
import json
import psycopg2
import shutil
import os

from pageindex import PageIndexClient
from groq import Groq
from psycopg2 import sql
import traceback

from config import DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, PAGEINDEX_API_KEY, GROQ_API_KEY, UPLOAD_DIR


def create_database_if_not_exists():
    try:
        # Connect to default postgres DB
        conn = psycopg2.connect(
            dbname="postgres",
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        conn.autocommit = True
        cursor = conn.cursor()

        # Check if DB exists
        cursor.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s",
            (DB_NAME,)
        )
        exists = cursor.fetchone()

        if not exists:
            cursor.execute(sql.SQL("CREATE DATABASE {}").format(
                sql.Identifier(DB_NAME)
            ))
            print(f"✅ Database '{DB_NAME}' created successfully")
        else:
            print(f"ℹ️ Database '{DB_NAME}' already exists")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Error while creating database: {e}")
        raise


def create_table_if_not_exists():
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        cursor = conn.cursor()

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id UUID PRIMARY KEY,
            doc_name TEXT,
            tree_json JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        conn.commit()
        cursor.close()
        conn.close()

        print("✅ Table 'documents' ready")

    except Exception as e:
        print(f"❌ Error while creating table: {e}")
        raise





app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    create_database_if_not_exists()
    create_table_if_not_exists()

# ── CONFIG ─────────────────────────────────────────────────────────

pi_client = PageIndexClient(api_key=PAGEINDEX_API_KEY)
openai_client = Groq(api_key=GROQ_API_KEY)
os.makedirs(UPLOAD_DIR, exist_ok=True)




# ── DB CONNECTION ──────────────────────────────────────────────────

def get_connection():
    return psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )


# ── 1. UPLOAD ENDPOINT ─────────────────────────────────────────────

@app.post("/upload-document")
async def upload_document(file: UploadFile = File(...)):
    try:
        # Save file locally
        print("Step 1: Saving file")

        os.makedirs(UPLOAD_DIR, exist_ok=True)

        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())

        print("Step 2: Uploading to PageIndex")

        # 1. Upload
        result = pi_client.submit_document(file_path)
        doc_id = result["doc_id"]

        # 2. Wait for processing
        import time

        for _ in range(15):
            status = pi_client.get_document(doc_id).get("status")

            if status == "completed":
                break

            time.sleep(2)
        else:
            raise Exception("Document processing timeout")

        # 3. Get tree
        # tree_response = pi_client.get_tree(doc_id, node_summary=True)
        # pageindex_tree = tree_response["result"]
        
        pageindex_tree = pi_client.get_tree(doc_id,node_summary=True)["result"]

        # Store in DB
        document_uuid = str(uuid.uuid4())

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "INSERT INTO documents (id, doc_name, tree_json) VALUES (%s, %s, %s)",
            (document_uuid, file.filename, json.dumps(pageindex_tree))
        )

        conn.commit()
        cursor.close()
        conn.close()

        #  Delete from PageIndex ONLY after successful DB save
        try:
            pi_client.delete_document(doc_id=doc_id)
            print(f" Deleted PageIndex document: {doc_id}")
        except Exception as delete_err:
            # Don't fail API if deletion fails
            print(f"Failed to delete PageIndex doc: {delete_err}")

        return {
            "message": "Document processed successfully",
            "document_id": document_uuid
        }

    except Exception as e:
       # raise HTTPException(status_code=500, detail=str(e))
   
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── 2. QUERY ENDPOINT (VECTORLESS RAG) ─────────────────────────────

def llm_tree_search(query: str, tree: list):
    def compress(nodes):
        out = []
        for n in nodes:
            entry = {
                "node_id": n["node_id"],
                "title": n["title"],
                "page": n.get("page_index", "?"),
                "summary": n.get("text", "")[:150]
            }
            if n.get("nodes"):
                entry["children"] = compress(n["nodes"])
            out.append(entry)
        return out

    compressed_tree = compress(tree)

    prompt = f"""
Query: {query}

Tree:
{json.dumps(compressed_tree)}

Return JSON:
{{"thinking": "...", "node_list": ["id1"]}}
"""

    response = openai_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )

    return json.loads(response.choices[0].message.content)


def find_nodes_by_ids(tree, ids):
    found = []
    for node in tree:
        if node["node_id"] in ids:
            found.append(node)
        if node.get("nodes"):
            found.extend(find_nodes_by_ids(node["nodes"], ids))
    return found


def generate_answer(query, nodes):
    context = "\n\n".join([
        f"{n['title']} (Page {n.get('page_index')})\n{n.get('text','')}"
        for n in nodes
    ])

    prompt = f"""
Answer using context only.

Question: {query}
Context: {context}
"""

    response = openai_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}]
    )

    return response.choices[0].message.content


@app.post("/ask")
async def ask_question(document_id: str, query: str):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT tree_json FROM documents WHERE id = %s",
            (document_id,)
        )

        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Document not found")

        tree = result[0]

        # RAG pipeline
        search_result = llm_tree_search(query, tree)
        node_ids = search_result.get("node_list", [])

        nodes = find_nodes_by_ids(tree, node_ids)
        answer = generate_answer(query, nodes)

        return {
            "answer": answer,
            "node_ids": node_ids
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 3. GET ALL DOCUMENT IDS ───────────────────────────────────────

@app.get("/documents")
def get_all_documents():
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id, doc_name FROM documents")
        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        return [
    {"id": str(r[0]), "name": r[1]}
    for r in rows
]


    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

#-----4. return Tree structer-------

def format_tree_pretty(nodes, level=0):
    """Recursively format tree into readable structure"""
    formatted = []

    for node in nodes:
        entry = {
            "title": node.get("title"),
            "node_id": node.get("node_id"),
            "page": node.get("page_index"),
            "summary": node.get("summary", "")[:200]  ,# limit text
            "text":    node.get("text", ""[:200])
        }

        # Add indentation level (optional but useful for UI)
        entry["level"] = level

        if node.get("nodes"):
            entry["children"] = format_tree_pretty(node["nodes"], level + 1)

        formatted.append(entry)

    return formatted

@app.get("/document-tree/{document_id}")
def get_pretty_tree(document_id: str):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT tree_json, doc_name FROM documents WHERE id = %s",
            (document_id,)
        )

        result = cursor.fetchone()

        cursor.close()
        conn.close()

        if not result:
            raise HTTPException(status_code=404, detail="Document not found")

        tree_json, doc_name = result

        pretty_tree = format_tree_pretty(tree_json)

        return {
            "document_id": document_id,
            "document_name": doc_name,
            "tree": pretty_tree
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
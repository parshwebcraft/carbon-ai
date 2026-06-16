-- 1. Conversation Memory Table
CREATE TABLE IF NOT EXISTS conversation_memory (
    memory_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    customer_id INTEGER NOT NULL,
    salesperson_id INTEGER NOT NULL,
    channel TEXT CHECK(channel IN ('Call', 'WhatsApp', 'CRM')),
    raw_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Transcript Chunks Table
CREATE TABLE IF NOT EXISTS transcript_chunks (
    chunk_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    speaker_label TEXT,
    chunk_text TEXT NOT NULL,
    start_time REAL,
    end_time REAL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Intent Logs Table
CREATE TABLE IF NOT EXISTS intent_logs (
    intent_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    text_segment TEXT NOT NULL,
    classified_intent TEXT NOT NULL,
    confidence_score REAL CHECK(confidence_score BETWEEN 0.0 AND 1.0),
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Retrieval Logs Table
CREATE TABLE IF NOT EXISTS retrieval_logs (
    retrieval_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    query_keywords TEXT NOT NULL,
    retrieved_source TEXT CHECK(retrieved_source IN ('products', 'quotations', 'leads', 'history')),
    source_reference_id INTEGER NOT NULL,
    retrieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. AI Feedback Table
CREATE TABLE IF NOT EXISTS ai_feedback (
    feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    ai_suggested_response TEXT NOT NULL,
    final_used_response TEXT NOT NULL,
    feedback_status TEXT CHECK(feedback_status IN ('accepted', 'edited', 'rejected')),
    latency_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

# Agent Memory — Local Vector Database

## Why Agents Need Memory

An AI agent without memory starts from zero every session. It re-asks questions, forgets preferences, re-investigates bugs. Memory changes this.

An agent can:
- Record a decision: *"We use UUIDs for all primary keys"*
- Record a user preference: *"User always wants dark mode defaults"*
- Record a debugging discovery: *"The auth bug was caused by a missing await"*
- ...and recall any of this semantically in a future session

## How It Works

Memory uses **ChromaDB**, a local vector database. No external API. No account. No data leaves your machine.

**Save:** ChromaDB embeds your text into a vector and stores it alongside the original text and metadata in `.data/chromadb/`.

**Search:** Your query is embedded into the same vector space. ChromaDB finds the nearest vectors using cosine similarity. This is **semantic search** — not keyword matching.

```
┌─────────────────────────────────────────────────────────────────┐
│                    ChromaDB Vector Store                         │
│                                                                  │
│  Memory: "User prefers dark mode"                               │
│  Vector: [0.23, -0.87, 0.41, 0.12, ...]  (768 dimensions)      │
│  Tags:   ["user_42", "preferences"]                             │
│                                                                  │
│  Search: "what are the UI preferences?"                         │
│  → cosine similarity → returns [dark mode memory, score: 0.92]  │
└─────────────────────────────────────────────────────────────────┘
```

## Using Memory (Python)

```python
from app.services.memory import MemoryService

svc = MemoryService()

# Save
svc.add(
    "We use UUIDs for all primary keys across the API",
    tags=["architecture", "decisions"],
    metadata={"decided_by": "team", "date": "2026-02-18"},
)

# Recall semantically
results = svc.search("what type of IDs do we use?")
for r in results:
    print(f"[{r['score']:.0%}] {r['content']}")

# List by tag
user_prefs = svc.list_memories(tags=["user_42"])

# Delete
svc.delete(memory_id="abc-123")
```

## Using Memory (CLI)

```bash
# Save a memory (with optional comma-separated tags)
bash skills/memory/run.sh save "User wants pagination on all list endpoints" "api,ux"

# Recall memories semantically
bash skills/memory/run.sh recall "what did we decide about lists?"

# List all memories tagged with a specific tag
bash skills/memory/run.sh list "api"
```

## Memory API Endpoints

```
POST /memory/add
Body: { "content": "string", "tags": ["string"], "metadata": {} }

POST /memory/search
Body: { "query": "string", "tags": ["string"], "limit": 10 }
```

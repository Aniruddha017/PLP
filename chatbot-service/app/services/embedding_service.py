from typing import Any
from app.db.supabase import get_supabase_admin_client


class EmbeddingService:
    """
    High-performance, lightweight embedding generation & pgvector similarity search.
    Utilizes BAAI/bge-small-en-v1.5 (384-dimensional) via FastEmbed ONNX runtime.
    Integrates directly with Supabase match_document_chunks RPC.
    """

    MODEL_NAME = "BAAI/bge-small-en-v1.5"

    def __init__(self):
        self._model = None

    @property
    def model(self):
        if self._model is None:
            from fastembed import TextEmbedding
            # Lazy initialization to keep startup fast
            self._model = TextEmbedding(model_name=self.MODEL_NAME)
        return self._model

    def embed_query(self, query: str) -> list[float]:
        """Generates a 384-dimensional dense vector for a query string."""
        if not query or not query.strip():
            return [0.0] * 384
        embeddings = list(self.model.embed([query.strip()]))
        return [float(x) for x in embeddings[0]]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Batch generates 384-dimensional dense vectors for documents."""
        if not texts:
            return []
        cleaned = [t.strip() if t.strip() else "empty section" for t in texts]
        embeddings = list(self.model.embed(cleaned))
        return [[float(x) for x in emb] for emb in embeddings]

    def store_document_chunks(
        self,
        document_id: str,
        user_id: str,
        chunks: list[dict[str, Any]],
        batch_size: int = 50,
    ) -> bool:
        """
        Computes embeddings in batch and inserts into Supabase public.document_chunks.
        """
        if not chunks:
            return True

        admin_client = get_supabase_admin_client()

        # Batch embed chunk texts
        contents = [c["content"] for c in chunks]
        embeddings = self.embed_documents(contents)

        records_to_insert = []
        for idx, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            records_to_insert.append({
                "document_id": document_id,
                "user_id": user_id,
                "chunk_index": chunk.get("chunk_index", idx),
                "content": chunk.get("content", ""),
                "page_number": chunk.get("page_number", 1),
                "heading": chunk.get("heading", ""),
                "embedding": emb,
                "metadata": chunk.get("metadata", {}),
            })

        # Insert in batches to prevent hitting request payload limits
        try:
            for i in range(0, len(records_to_insert), batch_size):
                batch = records_to_insert[i : i + batch_size]
                admin_client.table("document_chunks").insert(batch).execute()
            return True
        except Exception as e:
            print(f"[EmbeddingService] Error storing chunks in Supabase: {e}")
            raise e

    def search_similar_chunks(
        self,
        document_id: str,
        user_id: str,
        query: str,
        match_count: int = 5,
    ) -> list[dict[str, Any]]:
        """
        Performs vector cosine similarity search via match_document_chunks Supabase RPC.
        Falls back to text retrieval if pgvector RPC is unavailable.
        """
        admin_client = get_supabase_admin_client()
        query_vector = self.embed_query(query)

        try:
            rpc_res = admin_client.rpc(
                "match_document_chunks",
                {
                    "query_embedding": query_vector,
                    "filter_document_id": document_id,
                    "filter_user_id": user_id,
                    "match_count": match_count,
                },
            ).execute()

            if rpc_res.data:
                return rpc_res.data
        except Exception as e:
            print(f"[EmbeddingService] Vector RPC match failed ({e}), attempting text fallback...")

        # Fallback: Retrieve chronological chunks for document
        try:
            res = (
                admin_client.table("document_chunks")
                .select("id, document_id, content, page_number, heading")
                .eq("document_id", document_id)
                .order("chunk_index")
                .limit(match_count)
                .execute()
            )
            return res.data or []
        except Exception as e:
            print(f"[EmbeddingService] Fallback chunk retrieval failed: {e}")
            return []


embedding_service = EmbeddingService()

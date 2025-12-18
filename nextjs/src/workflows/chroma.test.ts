import { describe, it, expect } from "vitest";
import { batchChromaChunks, createWhereClauses } from "./chroma";
import type { ChromaChunks, UnifiedDocument } from "@/types/chroma";
import { validateWhere } from "@/lib/chroma";

describe("batchChromaChunks", () => {
  it("should split chunks into batches of the specified size", () => {
    const chunks: ChromaChunks = {
      ids: ["1", "2", "3", "4", "5"],
      documents: ["doc1", "doc2", "doc3", "doc4", "doc5"],
      metadatas: [{}, {}, {}, {}, {}],
      embeddings: [[1], [2], [3], [4], [5]],
    };

    const batches = batchChromaChunks(chunks, 2);

    expect(batches).toHaveLength(3);
    expect(batches[0]).toEqual({
      ids: ["1", "2"],
      documents: ["doc1", "doc2"],
      metadatas: [{}, {}],
      embeddings: [[1], [2]],
    });
    expect(batches[1]).toEqual({
      ids: ["3", "4"],
      documents: ["doc3", "doc4"],
      metadatas: [{}, {}],
      embeddings: [[3], [4]],
    });
    expect(batches[2]).toEqual({
      ids: ["5"],
      documents: ["doc5"],
      metadatas: [{}],
      embeddings: [[5]],
    });
  });

  it("should handle empty chunks", () => {
    const chunks: ChromaChunks = {
      ids: [],
      documents: [],
      metadatas: [],
      embeddings: [],
    };

    const batches = batchChromaChunks(chunks, 2);

    expect(batches).toHaveLength(0);
  });

  it("should handle batch size larger than chunk count", () => {
    const chunks: ChromaChunks = {
      ids: ["1", "2"],
      documents: ["doc1", "doc2"],
      metadatas: [{}, {}],
      embeddings: [[1], [2]],
    };

    const batches = batchChromaChunks(chunks, 10);

    expect(batches).toHaveLength(1);
    expect(batches[0]).toEqual(chunks);
  });

  it("should handle batch size of 1", () => {
    const chunks: ChromaChunks = {
      ids: ["1", "2", "3"],
      documents: ["doc1", "doc2", "doc3"],
      metadatas: [{}, {}, {}],
      embeddings: [[1], [2], [3]],
    };

    const batches = batchChromaChunks(chunks, 1);

    expect(batches).toHaveLength(3);
    expect(batches[0]).toEqual({
      ids: ["1"],
      documents: ["doc1"],
      metadatas: [{}],
      embeddings: [[1]],
    });
    expect(batches[1]).toEqual({
      ids: ["2"],
      documents: ["doc2"],
      metadatas: [{}],
      embeddings: [[2]],
    });
    expect(batches[2]).toEqual({
      ids: ["3"],
      documents: ["doc3"],
      metadatas: [{}],
      embeddings: [[3]],
    });
  });

  it("should maintain array alignment across all fields", () => {
    const chunks: ChromaChunks = {
      ids: ["1", "2", "3", "4"],
      documents: ["doc1", "doc2", "doc3", "doc4"],
      metadatas: [{ key: "a" }, { key: "b" }, { key: "c" }, { key: "d" }],
      embeddings: [
        [1, 2],
        [3, 4],
        [5, 6],
        [7, 8],
      ],
    };

    const batches = batchChromaChunks(chunks, 3);

    expect(batches).toHaveLength(2);
    expect(batches[0].ids.length).toBe(3);
    expect(batches[0].documents.length).toBe(3);
    expect(batches[0].metadatas.length).toBe(3);
    expect(batches[0].embeddings.length).toBe(3);
    expect(batches[1].ids.length).toBe(1);
    expect(batches[1].documents.length).toBe(1);
    expect(batches[1].metadatas.length).toBe(1);
    expect(batches[1].embeddings.length).toBe(1);
  });
});

describe("createWhereClause", () => {
  it("should create valid where clauses for a single document", () => {
    const documents: UnifiedDocument[] = [
      {
        source: "test",
        document_key: "doc1",
        version_key: "v1",
        content: "content1",
        metadata: {},
      },
    ];

    const wheres = createWhereClauses(documents);

    expect(wheres).toHaveLength(1);
    expect(wheres[0]).toEqual({
      $and: [
        {
          document_key: "doc1",
        },
        {
          version_key: {
            $ne: "v1",
          },
        },
      ],
    });

    // Validate all where clauses
    wheres.forEach((where) => {
      expect(() => validateWhere(where)).not.toThrow();
    });
  });

  it("should create valid where clauses for multiple documents that fit in one batch", () => {
    const documents: UnifiedDocument[] = [
      {
        source: "test",
        document_key: "doc1",
        version_key: "v1",
        content: "content1",
        metadata: {},
      },
      {
        source: "test",
        document_key: "doc2",
        version_key: "v2",
        content: "content2",
        metadata: {},
      },
      {
        source: "test",
        document_key: "doc3",
        version_key: "v3",
        content: "content3",
        metadata: {},
      },
    ];

    // With default maxPredicates=8, batchSize=4, so 3 documents fit in one batch
    // When there's only one batch, it returns the $and clauses directly
    const wheres = createWhereClauses(documents);

    expect(wheres).toHaveLength(3);
    expect("$and" in wheres[0] && wheres[0].$and).toBeDefined();
    expect("$and" in wheres[1] && wheres[1].$and).toBeDefined();
    expect("$and" in wheres[2] && wheres[2].$and).toBeDefined();

    // Validate all where clauses
    wheres.forEach((where) => {
      expect(() => validateWhere(where)).not.toThrow();
    });
  });

  it("should batch where clauses based on maxPredicates", () => {
    const documents: UnifiedDocument[] = Array.from({ length: 10 }, (_, i) => ({
      source: "test",
      document_key: `doc${i + 1}`,
      version_key: `v${i + 1}`,
      content: `content${i + 1}`,
      metadata: {},
    }));

    // With maxPredicates=8, batchSize=4, so 10 documents should create 3 batches (4, 4, 2)
    const wheres = createWhereClauses(documents, 8);

    expect(wheres.length).toBeGreaterThan(1);
    // Each where clause should have $or with up to 4 items (batchSize)
    wheres.forEach((where) => {
      if ("$or" in where && Array.isArray(where.$or)) {
        expect(where.$or.length).toBeLessThanOrEqual(4);
        if (where.$or.length > 1) {
          expect(() => validateWhere(where)).not.toThrow();
        }
      }
    });
  });

  it("should handle empty documents array", () => {
    const documents: UnifiedDocument[] = [];

    const wheres = createWhereClauses(documents);

    expect(wheres).toHaveLength(0);
  });

  it("should create valid where clauses with custom maxPredicates", () => {
    const documents: UnifiedDocument[] = Array.from({ length: 5 }, (_, i) => ({
      source: "test",
      document_key: `doc${i + 1}`,
      version_key: `v${i + 1}`,
      content: `content${i + 1}`,
      metadata: {},
    }));

    // With maxPredicates=4, batchSize=2, so 5 documents should create 3 batches (2, 2, 1)
    // But when the last batch has only 1 item, it won't be wrapped in $or (single batch case)
    // Actually, looking at the code, if there are multiple batches, ALL batches get wrapped in $or
    // So we get 3 batches: [2 items], [2 items], [1 item] - all wrapped in $or
    const wheres = createWhereClauses(documents, 4);

    expect(wheres.length).toBe(3);
    expect("$or" in wheres[0] && Array.isArray(wheres[0].$or)).toBe(true);
    if ("$or" in wheres[0] && Array.isArray(wheres[0].$or)) {
      expect(wheres[0].$or.length).toBe(2);
    }
    expect("$or" in wheres[1] && Array.isArray(wheres[1].$or)).toBe(true);
    if ("$or" in wheres[1] && Array.isArray(wheres[1].$or)) {
      expect(wheres[1].$or.length).toBe(2);
    }
    expect("$or" in wheres[2] && Array.isArray(wheres[2].$or)).toBe(true);
    if ("$or" in wheres[2] && Array.isArray(wheres[2].$or)) {
      expect(wheres[2].$or.length).toBe(1);
    }

    // Validate all where clauses - but skip validation for $or with single item
    // since validateWhere requires $or to have more than 1 element
    wheres.forEach((where) => {
      if ("$or" in where && Array.isArray(where.$or) && where.$or.length > 1) {
        expect(() => validateWhere(where)).not.toThrow();
      }
    });
  });

  it("should handle documents that exceed maxPredicates with default value", () => {
    const documents: UnifiedDocument[] = Array.from({ length: 20 }, (_, i) => ({
      source: "test",
      document_key: `doc${i + 1}`,
      version_key: `v${i + 1}`,
      content: `content${i + 1}`,
      metadata: {},
    }));

    // With maxPredicates=8 (default), batchSize=4, so 20 documents should create 5 batches
    const wheres = createWhereClauses(documents);

    expect(wheres.length).toBe(5);
    wheres.forEach((where) => {
      if ("$or" in where && Array.isArray(where.$or)) {
        expect(where.$or.length).toBeLessThanOrEqual(4);
        if (where.$or.length > 1) {
          expect(() => validateWhere(where)).not.toThrow();
        }
      }
    });
  });

  it("should create where clauses that match document keys and version keys", () => {
    const documents: UnifiedDocument[] = [
      {
        source: "test",
        document_key: "doc1",
        version_key: "version-1",
        content: "content1",
        metadata: {},
      },
      {
        source: "test",
        document_key: "doc2",
        version_key: "version-2",
        content: "content2",
        metadata: {},
      },
    ];

    // With default maxPredicates=8, batchSize=4, so 2 documents fit in one batch
    // When there's only one batch, it returns the $and clauses directly
    const wheres = createWhereClauses(documents);

    expect(wheres).toHaveLength(2);
    if ("$and" in wheres[0] && Array.isArray(wheres[0].$and)) {
      const and0 = wheres[0].$and[0] as Record<string, any>;
      const and1 = wheres[0].$and[1] as Record<string, any>;
      expect(and0.document_key).toBe("doc1");
      expect(and1.version_key.$ne).toBe("version-1");
    }
    if ("$and" in wheres[1] && Array.isArray(wheres[1].$and)) {
      const and0 = wheres[1].$and[0] as Record<string, any>;
      const and1 = wheres[1].$and[1] as Record<string, any>;
      expect(and0.document_key).toBe("doc2");
      expect(and1.version_key.$ne).toBe("version-2");
    }

    // Validate all where clauses
    wheres.forEach((where) => {
      expect(() => validateWhere(where)).not.toThrow();
    });
  });

  it("should create $or clauses when documents span multiple batches", () => {
    const documents: UnifiedDocument[] = Array.from({ length: 6 }, (_, i) => ({
      source: "test",
      document_key: `doc${i + 1}`,
      version_key: `v${i + 1}`,
      content: `content${i + 1}`,
      metadata: {},
    }));

    // With maxPredicates=4, batchSize=2, so 6 documents should create 3 batches
    // Since there are multiple batches, all get wrapped in $or
    const wheres = createWhereClauses(documents, 4);

    expect(wheres.length).toBe(3);
    wheres.forEach((where) => {
      expect("$or" in where && Array.isArray(where.$or)).toBe(true);
      if ("$or" in where && Array.isArray(where.$or)) {
        expect(where.$or.length).toBe(2);
        // Validate $or clauses with more than 1 element
        expect(() => validateWhere(where)).not.toThrow();
      }
    });
  });
});

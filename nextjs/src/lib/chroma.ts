import { ChromaValueError, CloudClient, Collection, Schema, VectorIndexConfig, Where } from "chromadb";
import { ChromaCloudQwenEmbeddingFunction, ChromaCloudQwenEmbeddingModel, ChromaCloudQwenEmbeddingTask } from "@chroma-core/chroma-cloud-qwen";
import { ChromaCredentials } from "@/types/chroma";


export const schema = new Schema()
  .createIndex(new VectorIndexConfig({
    embeddingFunction: new ChromaCloudQwenEmbeddingFunction({
      apiKeyEnvVar: "CHROMA_API_KEY",
      model: ChromaCloudQwenEmbeddingModel.QWEN3_EMBEDDING_0p6B,
      task: ChromaCloudQwenEmbeddingTask.NL_TO_CODE,
    })
  }));

export function getCollection(credentials: ChromaCredentials, collectionName: string): Promise<Collection> {
  const client = new CloudClient({
    apiKey: credentials.apiKey,
    tenant: credentials.tenantUuid,
    database: credentials.databaseName,
  });

  return client.getOrCreateCollection({ name: collectionName, schema });
}

//https://github.com/chroma-core/chroma/blob/main/clients/new-js/packages/chromadb/src/utils.ts

/**
 * Validates a where clause for metadata filtering.
 * @param where - Where clause object to validate
 * @throws ChromaValueError if the where clause is malformed
 */
export const validateWhere = (where: Where) => {
  if (typeof where !== "object") {
    throw new ChromaValueError("Expected where to be a non-empty object");
  }

  if (Object.keys(where).length != 1) {
    throw new ChromaValueError(
      `Expected 'where' to have exactly one operator, but got ${Object.keys(where).length
      }`,
    );
  }

  Object.entries(where).forEach(([key, value]) => {
    if (
      key !== "$and" &&
      key !== "$or" &&
      key !== "$in" &&
      key !== "$nin" &&
      !["string", "number", "boolean", "object"].includes(typeof value)
    ) {
      throw new ChromaValueError(
        `Expected 'where' value to be a string, number, boolean, or an operator expression, but got ${value}`,
      );
    }

    if (key === "$and" || key === "$or") {
      if (Object.keys(value).length <= 1) {
        throw new ChromaValueError(
          `Expected 'where' value for $and or $or to be a list of 'where' expressions, but got ${value}`,
        );
      }

      value.forEach((w: Where) => validateWhere(w));
      return;
    }

    if (typeof value === "object") {
      if (Object.keys(value).length != 1) {
        throw new ChromaValueError(
          `Expected operator expression to have one operator, but got ${value}`,
        );
      }

      const [operator, operand] = Object.entries(value)[0];

      if (
        ["$gt", "$gte", "$lt", "$lte"].includes(operator) &&
        typeof operand !== "number"
      ) {
        throw new ChromaValueError(
          `Expected operand value to be a number for ${operator}, but got ${typeof operand}`,
        );
      }

      if (["$in", "$nin"].includes(operator) && !Array.isArray(operand)) {
        throw new ChromaValueError(
          `Expected operand value to be an array for ${operator}, but got ${operand}`,
        );
      }

      if (
        !["$gt", "$gte", "$lt", "$lte", "$ne", "$eq", "$in", "$nin"].includes(
          operator,
        )
      ) {
        throw new ChromaValueError(
          `Expected operator to be one of $gt, $gte, $lt, $lte, $ne, $eq, $in, $nin, but got ${operator}`,
        );
      }

      if (
        !["string", "number", "boolean"].includes(typeof operand) &&
        !Array.isArray(operand)
      ) {
        throw new ChromaValueError(
          "Expected operand value to be a string, number, boolean, or a list of those types",
        );
      }

      if (
        Array.isArray(operand) &&
        (operand.length === 0 ||
          !operand.every((item) => typeof item === typeof operand[0]))
      ) {
        throw new ChromaValueError(
          "Expected 'where' operand value to be a non-empty list and all values to be of the same type",
        );
      }
    }
  });
};
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || "";

export const handler = async (event: any = {}): Promise<any> => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  if (event.httpMethod !== "PUT") {
    return {
      statusCode: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  let pk = event.pathParameters?.id;
  if (!pk) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify({ message: "Missing path parameter: id is required" }),
    };
  }


  if (!event.body) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify({ message: "Missing request body" }),
    };
  }

  let bodyParsed;
  try {
    bodyParsed = JSON.parse(event.body);
  } catch (error: any) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify({ message: "Invalid JSON body", error: error.message }),
    };
  }

  // ✅ Ensure the item exists before updating
  try {
    const existingItem = await dynamoDb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk }, // ✅ Use correct key format
      })
    );

    if (!existingItem.Item) {
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
        body: JSON.stringify({ message: "Task not found",pk }),
      };
    }
  } catch (error: any) {
    console.error("DynamoDB GetCommand error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error checking item existence", error: error.message,pk:pk }),
    };
  }

  // ✅ Construct the Update Expression
  const updateExpressionParts: string[] = [];
  const expressionAttributeValues: Record<string, any> = {};
  const expressionAttributeNames: Record<string, string> = {};

  for (const [key, value] of Object.entries(bodyParsed)) {
    updateExpressionParts.push(`#${key} = :${key}`);
    expressionAttributeValues[`:${key}`] = value;
    expressionAttributeNames[`#${key}`] = key;
  }

  const updateExpression = `SET ${updateExpressionParts.join(", ")}`;

  try {
    await dynamoDb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk }, // ✅ Ensure primary key format is correct
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        ConditionExpression: "attribute_exists(pk)", // 🔹 Ensure item exists before updating
      })
    );

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify({ message: "Task updated successfully" }),
    };
  } catch (error: any) {
    console.error("DynamoDB UpdateCommand error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error", error: error.message,pk:pk }),
    };
  }
};

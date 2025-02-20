import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';

const dynamodb = new DynamoDB({});

export async function getAll() {
  const result = await dynamodb.send(
    new ScanCommand({
      TableName: "post",
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify(result.Items),
  };
}
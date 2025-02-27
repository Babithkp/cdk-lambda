import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { AttributeType, Table, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import {
  Cors,
  LambdaIntegration,
  RestApi,
  ApiKeySourceType,
  ApiKey,
  UsagePlan,
} from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";


export class CdkLamdaDynamodbStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dbTable = new Table(this, "DbTable", {
      partitionKey: { name: "pk", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    const api = new RestApi(this, "RestAPI", {
      restApiName: "RestAPI",
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: ["*"],
        
      },
      apiKeySourceType: ApiKeySourceType.HEADER,
    });

    const apiKey = new ApiKey(this, "ApiKey");

    const usagePlan = new UsagePlan(this, "UsagePlan", {
      name: "Usage Plan",
      apiStages: [
        {
          api,
          stage: api.deploymentStage,
        },
      ],
    });

    usagePlan.addApiKey(apiKey);


  
    const getTasksLambda = new NodejsFunction(this, "getTasksLambda", {
      entry: path.join(__dirname, "../resources/endpoints/getTasks.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: dbTable.tableName,
      },
    });

    const updateTaskLambda = new NodejsFunction(this, "updateTaskLambda", {
      entry: path.join(__dirname, "../resources/endpoints/updateTask.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: dbTable.tableName,
      },
    });

    const deleteTaskLambda = new NodejsFunction(this, "deleteTaskLambda", {
      entry: path.join(__dirname, "../resources/endpoints/deleteTask.ts"),
     
      handler: "handler",
      environment: {
        TABLE_NAME: dbTable.tableName,
      },
    });

    const addTaskLambda = new NodejsFunction(this, "addTaskLambda", {
      entry: path.join(__dirname, "../resources/endpoints/addTask.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: dbTable.tableName,
      },
    });


    dbTable.grantReadWriteData(getTasksLambda);
    dbTable.grantFullAccess(updateTaskLambda);
    dbTable.grantFullAccess(deleteTaskLambda);
    dbTable.grantReadWriteData(addTaskLambda);


    const gettasks = api.root.addResource("gettasks");
    const addTask = api.root.addResource("addTask");
    const deleteTask = api.root.addResource("deleteTask").addResource("{id}");
    const updateTask = api.root.addResource("updateTask").addResource("{id}");

    const getTasksIntegration = new LambdaIntegration(getTasksLambda);
    const updateTaskIntegration = new LambdaIntegration(updateTaskLambda);
    const deleteTaskIntegration = new LambdaIntegration(deleteTaskLambda);
    const addTaskIntegration = new LambdaIntegration(addTaskLambda);

    gettasks.addMethod("GET", getTasksIntegration, {
      apiKeyRequired: true,
    });

    addTask.addMethod("POST", addTaskIntegration, {
      apiKeyRequired: true,
    });

    deleteTask.addMethod("DELETE", deleteTaskIntegration, {
      apiKeyRequired: true,
    });

    updateTask.addMethod("PUT", updateTaskIntegration, {
      apiKeyRequired: true,
    });

    new CfnOutput(this, "API Key ID", {
      value: apiKey.keyId,
    });
  }
}

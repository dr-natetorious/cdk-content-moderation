import { Construct } from 'constructs'
import {  
  aws_sqs as sqs,
  aws_sns as sns,
  aws_dynamodb as ddb,
  aws_iam as iam,
  aws_events as e,
  aws_sns_subscriptions as subs,
  aws_events_targets as et,
  aws_stepfunctions as sf,
  aws_stepfunctions_tasks as sft,
  aws_lambda as lambda,
  Duration,
} from 'aws-cdk-lib'
import { ISyncModerator } from './interface';

class InsertMessageFunction extends Construct{

  public function: lambda.IFunction;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    __dirname

    this.function = new lambda.Function(this,'Function',{
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromInline(`
from typing import List, Mapping

def process_event(event:dict, _:dict)->dict:
  languages:List[Mapping[str,str]] = event['Languages']
  languages.sort(key= lambda x: x['Score'], reverse=True)
  return {
    'LanguageCode': languages[0]['LanguageCode']
  }`),
      handler: 'index.process_event'
    })
  }
}

class NotificationChannelConstruct extends Construct{
  
  public readonly topic: sns.ITopic;
  public readonly table: ddb.ITable;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.table = new ddb.Table(this,'Table',{
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'JobId',
        type: ddb.AttributeType.STRING
      },
    })

    this.topic = new sns.Topic(this,'Topic',{
      //topicName: 'AmazonRekognitionVideoNotifications',
      displayName: 'Video Label Topic'
    })

    const processor = new InsertMessageFunction(this,'Processor')
    this.topic.addSubscription(new subs.LambdaSubscription(processor.function,{
      'deadLetterQueue': new sqs.Queue(this,'DeadLetterQueue')
    }))
  }
}

export class postModerateVideo extends Construct implements ISyncModerator {
  public syncStateMachine: sf.IStateMachine;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // const notificationChannel = new NotificationChannelConstruct(this,'Notifications')

    // const topicWriterRole = new iam.Role(this,'TopicPublisherRole',{
    //   assumedBy: new iam.ServicePrincipal('rekognition'),
    //   inlinePolicies:{
    //     'AllowTopic': new iam.PolicyDocument({
    //     statements:[
    //       new iam.PolicyStatement({
    //         effect: iam.Effect.ALLOW,
    //         actions: ['sns:publish'],
    //         resources: [ notificationChannel.topic.topicArn]
    //       }) ] })
    //   }
    // });

    const startLabelDetection = new sft.CallAwsService(this,'Start-LabelDetection',{
      service: 'rekognition',
      action: 'startLabelDetection',
      iamResources: ["*"],
      resultPath: '$.labels',
      parameters:{
        'Video': {
          'S3Object':{
            'Bucket': '$.inputRequest.bucket',
            'Name': '$.inputRequest.key'
          }
        },
        'ClientRequestToken': "States.Format('s3://{}/{}', $.inputRequest.bucket, $.inputRequest.key)",
        // 'NotificationChannel':{
        //   'SNSTopicArn':notificationChannel.topic.topicArn,
        //   'RoleArn': topicWriterRole.roleArn,
        // }
      }
    });

    const getLabelDetection = new sft.CallAwsService(this,'Get-LabelDetection',{
      service: 'rekognition',
      action: 'getLabelDetection',
      iamResources: ["*"],
      resultPath: '$.status',
      parameters:{
        'JobId': '$.labels.Payload.JobId',
        'MaxResults': 1,        
      }
    });

    const waitForLabeling = new sf.Wait(this,'WaitFor-Labeling',{ 
      time:sf.WaitTime.duration(Duration.seconds(10))
    })

    startLabelDetection.next(getLabelDetection)
    waitForLabeling.next(getLabelDetection)

    const labelingComplete = new sf.Choice(this,'Is-LabelingComplete')
    labelingComplete.when(
      sf.Condition.stringEquals('$.status.Payload.JobStatus','FAILED'),
      new sf.Fail(this,'Labeling-Failed'))
    labelingComplete.when(
        sf.Condition.stringEquals('$.status.Payload.JobStatus','SUCCEEDED'),
        new sf.Pass(this,'Labeling-Finished-AddCodeHere'))
    labelingComplete.otherwise(waitForLabeling)

    getLabelDetection.next(labelingComplete)

    const startTextDetection = new sft.CallAwsService(this,'Start-TextDetection',{
      service: 'rekognition',
      action: 'startTextDetection',
      iamResources: ["*"],
      resultPath: '$.text',
      parameters:{
        'Video': {
          'S3Object':{
            'Bucket': '$.inputRequest.bucket',
            'Name': '$.inputRequest.key'
          }
        },
        'ClientRequestToken': "States.Format('s3://{}/{}', $.inputRequest.bucket, $.inputRequest.key)",
        // 'NotificationChannel':{
        //   'SNSTopicArn':notificationChannel.topic.topicArn,
        //   'RoleArn': topicWriterRole.roleArn,
        // }
      }
    });

    const getTextDetection = new sft.CallAwsService(this,'Get-TextDetection',{
      service: 'rekognition',
      action: 'getTextDetection',
      iamResources: ["*"],
      resultPath: '$.status',
      parameters:{
        'JobId': '$.labels.Payload.JobId',
        'MaxResults': 1,        
      }
    });

    const waitForText = new sf.Wait(this,'WaitFor-Text',{ 
      time:sf.WaitTime.duration(Duration.seconds(10))
    })
    waitForText.next(getTextDetection)

    const isTextComplete = new sf.Choice(this,'Is-TextComplete')
    isTextComplete.when(
      sf.Condition.stringEquals('$.status.Payload.JobStatus','FAILED'),
      new sf.Fail(this,'Text-Failed'))
      isTextComplete.when(
        sf.Condition.stringEquals('$.status.Payload.JobStatus','SUCCEEDED'),
        new sf.Pass(this,'Text-Finished-AddCodeHere'))
        isTextComplete.otherwise(waitForText)

    startTextDetection.next(getTextDetection)
    getTextDetection.next(isTextComplete)

    const parallel = new sf.Parallel(this, 'Parallel')
    parallel.branch(startLabelDetection,startTextDetection)

    this.syncStateMachine = new sf.StateMachine(this,'Sfn',{
      definition: parallel,
      stateMachineType: sf.StateMachineType.EXPRESS,
    });
  }
}

import { Construct } from 'constructs'
import {  
  aws_s3 as s3,
  aws_iam as iam,
  aws_events as e,
  aws_apigateway as api,
  aws_events_targets as et,
  aws_stepfunctions as sf,
  aws_stepfunctions_tasks as sft,
} from 'aws-cdk-lib'


export class PostModerateImage extends Construct {
  
  public stateMachine: sf.IStateMachine;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const detect = new sft.CallAwsService(this,'DetectLabels',{
      service: 'rekognition',
      action: 'detectModerationLabels',
      iamResources:["*"],
      parameters:{
        'Image':{
          'S3Object':{
            'Bucket': '$.inputRequest.bucket',
            'Name': '$.inputRequest.key'
          }
        }
      }
    });

    this.stateMachine = new sf.StateMachine(this,'Sfn',{
      definition: detect,
      stateMachineType: sf.StateMachineType.EXPRESS,
    });
  }
}
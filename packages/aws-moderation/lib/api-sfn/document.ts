import { Construct } from 'constructs'
import {  
  aws_s3 as s3,
  aws_iam as iam,
  aws_events as e,
  aws_apigateway as api,
  aws_events_targets as et,
  aws_stepfunctions as sf,
  aws_stepfunctions_tasks as sft,
  Duration,
} from 'aws-cdk-lib'

export class PostModerateDocument extends Construct {
  
  public stateMachine: sf.IStateMachine;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const analyzeDocument = new sft.CallAwsService(this,'AnalyzeDocument',{
      service: 'textract',
      action: 'analyzeDocument',
      iamResources:["*"],
      resultPath:'$.analyze',
      parameters:{
        'Document':{
          'S3Object': "States.Format('s3://{}/{}', $.inputRequest.bucket, $.inputRequest.key)"
        },
        'FeatureTypes':[
          'TABLES', 'FORMS'
        ]
      }
    });

    const mapOperation = new sf.Map(this,'Foreach-Block',{
      itemsPath: '$.analyzeDocument.Payload.Blocks',
      parameters:{
        'inputRequest.%': '$.inputRequest',
        'DocumentMetadata.%': '$.analyze.Payload.DocumentMetadata',
        'HumanLoopActivationOutput.%': '$.analyze.Payload.HumanLoopActivationOutput',
        'AnalyzeDocumentModelVersion.%': '$.analyze.Payload.AnalyzeDocumentModelVersion'
      }
    });

    analyzeDocument.next(mapOperation)
    mapOperation.iterator(new sf.Pass(this, 'Add-CodeHere'))
    
    this.stateMachine = new sf.StateMachine(this,'StateMachine',{
      definition: analyzeDocument,
      stateMachineType: sf.StateMachineType.EXPRESS,
    });
  }
}
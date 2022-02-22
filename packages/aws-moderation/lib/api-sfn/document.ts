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
          'S3Object': {
            'Bucket':'$.inputRequest.bucket', 
            'Name':'$.inputRequest.key'
          }
        },
        'FeatureTypes':[
          'TABLES', 'FORMS'
        ]
      }
    });

    const foreachBlock = new sf.Map(this,'Foreach-Block',{
      itemsPath: '$.analyzeDocument.Payload.Blocks',
      parameters:{
        'inputRequest.%': '$.inputRequest',
        'block': '$',
        'DocumentMetadata.%': '$.analyze.Payload.DocumentMetadata',
        'HumanLoopActivationOutput.%': '$.analyze.Payload.HumanLoopActivationOutput',
        'AnalyzeDocumentModelVersion.%': '$.analyze.Payload.AnalyzeDocumentModelVersion'
      }
    });


    const detectPiiEntries = new sft.CallAwsService(this,'Detect-PiiEntities',{
      service: 'comprehend',
      action: 'detectPiiEntities',
      iamResources: ["*"],
      resultPath: '$.pii',
      parameters:{
        'Text': '$.inputRequest.text',
        'LanguageCode': '$.inputRequest.languageCode'
      },
    });

    const isInterestingBlock = new sf.Choice(this, 'Is-InterestingBlock')
    isInterestingBlock.when(
      sf.Condition.stringEquals('$.block.BlockType', 'KEY_VALUE_SET'),
      detectPiiEntries
    );
    isInterestingBlock.otherwise(
      new sf.Pass(this,'Maybe-NotInteresting'));

    analyzeDocument.next(foreachBlock)
    foreachBlock.iterator(isInterestingBlock)                                                                            
    
    this.stateMachine = new sf.StateMachine(this,'StateMachine',{
      definition: analyzeDocument,
      stateMachineType: sf.StateMachineType.EXPRESS,
    });
  }
}
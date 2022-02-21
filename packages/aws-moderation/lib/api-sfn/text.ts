import { Construct } from 'constructs'
import {  
  aws_s3 as s3,
  aws_iam as iam,
  aws_events as e,
  aws_apigateway as api,
  aws_events_targets as et,
  aws_stepfunctions as sf,
  aws_stepfunctions_tasks as sft,
  aws_lambda as lambda,
} from 'aws-cdk-lib'


class SelectLanguageFunction extends Construct{

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

export class PostModerateText extends Construct {
  public stateMachine: sf.IStateMachine;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const detectLanguage = new sft.CallAwsService(this,'Detect-DominantLanguage',{
      service: 'comprehend',
      action: 'detectDominantLanguage',
      iamResources: ["*"],
      resultPath: '$.language',
      parameters:{
        'Text': '$.translated.Payload.TranslatedText'
      },
    });

    const selectLanguage = new sft.LambdaInvoke(this,'Process-LanguageDiscovery',{
      lambdaFunction: new SelectLanguageFunction(this,'Select-Lambda').function,
      resultPath: '$.language'
    })

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
      
    const detectSentiment = new sft.CallAwsService(this,'Detect-Sentiment',{
      service: 'comprehend',
      action: 'detectSentiment',
      iamResources: ["*"],
      resultPath: '$.sentiment',
      parameters:{
        'Text': '$.inputRequest.text',
        'LanguageCode': '$.inputRequest.languageCode'
      }
    });

    const translateText = new sft.CallAwsService(this,'Translate-Text',{
      service: 'translate',
      action: 'translateText',
      iamResources: ["*"],
      resultPath: '$.translated',
      parameters:{
        'Text': '$.inputRequest.text',
        'SourceLanguageCode': 'auto',
        'TargetLanguageCode': 'en-us',
      }
    });


    const requiresTranslation = new sf.Choice(this, 'Requires-Translation')
    requiresTranslation.when(
      sf.Condition.stringEquals('$.inputRequest.LanguageCode','en-us'),
      detectPiiEntries)
    requiresTranslation.otherwise(translateText)

    detectLanguage.next(selectLanguage).next(requiresTranslation)
    translateText.next(detectPiiEntries).next(detectSentiment).next(new sf.Pass(this,'Add-CodeHere'))

    this.stateMachine = new sf.StateMachine(this,'StateMachine',{
      definition: detectLanguage,
      stateMachineType: sf.StateMachineType.EXPRESS
    });
  }
}
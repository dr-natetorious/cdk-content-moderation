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
import { WaitTime } from 'aws-cdk-lib/aws-stepfunctions';


export class PostModerateAudio extends Construct {
  
  public stateMachine: sf.IStateMachine;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const startJob = new sft.CallAwsService(this,'StartTranscriptionJob',{
      service: 'transcribe',
      action: 'startTranscriptionJob',
      iamResources:["*"],
      resultPath:'$.start',
      parameters:{
        'TranscriptionJobName': '$.inputRequest.key',
        'Media':{
          'MediaFileUri': "States.Format('s3://{}/{}', $.inputRequest.bucket, $.inputRequest.key)"
        },
        'JobExecutionSettings':{
          'AllowDeferredExecution': true
        }
      }
    });

    const wait = new sf.Wait(this,'Wait',{
      time: WaitTime.duration(Duration.seconds(5))
    })

    const getJobStatus = new sft.CallAwsService(this,'GetTranscriptionJob',{
      service:'transcribe',
      action: 'getTranscriptionJob',
      iamResources:["*"],
      resultPath: '$.status',
      parameters:{
        'TranscriptionJobName': '$.start.TranscriptionJob.TranscriptionJobName'
      }
    })

    const isComplete = new sf.Choice(this,'IsComplete',{
      comment: "Check if the transcription job is complete",
    })

    isComplete.when(
      sf.Condition.stringEquals(
        '$.status.TranscriptionJob.TranscriptionJobStatus','FAILED'),
        new sf.Fail(this,'TranscriptionFailed',{
          comment: 'Unable to complete transcription'
        }))

    isComplete.when(
      sf.Condition.or(
        sf.Condition.stringEquals(
          '$.status.TranscriptionJob.TranscriptionJobStatus','QUEUED'),
        sf.Condition.stringEquals(
          '$.status.TranscriptionJob.TranscriptionJobStatus','IN_PROGRESS')
        ),
      wait)

    isComplete.otherwise(
      new sf.Pass(this,'Add-More-Here')
    )

    startJob.next(getJobStatus).next(isComplete)

    this.stateMachine = new sf.StateMachine(this,'Sfn',{
      definition: startJob,
      stateMachineType: sf.StateMachineType.EXPRESS,
    });
  }
}
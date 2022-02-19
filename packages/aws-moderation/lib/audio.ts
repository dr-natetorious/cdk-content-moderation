import { Construct } from 'constructs'
import { Duration } from 'aws-cdk-lib';
import {  
  aws_s3 as s3,
  aws_iam as iam,
  aws_events as e,
  aws_events_targets as et,
  aws_stepfunctions as sf,
  aws_stepfunctions_tasks as sft,
} from 'aws-cdk-lib'


export interface SfnAudioModeratorProps {
  bucket: s3.IBucket,
}

export class SfnAudioModerator extends Construct {

  public readonly stateMachine: sf.StateMachine;

  constructor(scope: Construct, id: string, props: SfnAudioModeratorProps) {
    super(scope, id);

    // Define the role.
    var role = new iam.Role(this, 'Role',{
      assumedBy: new iam.ServicePrincipal("events.amazonaws.com")
    })
    props.bucket?.grantRead(role)

    // Declare the state machine.
    // var transcribe = new sft.CallAwsService(this, 'Transcribe',{
    //   service:'transcribe',
    //   action:'startTranscriptionJob',
    //   parameters:{
    //     ''
    //   }
    // })

    this.stateMachine = new sf.StateMachine(this,'SfnAudioModerator',{
      role: role,
      definition: new sf.Wait(this,'Hello',{
        time: sf.WaitTime.duration(Duration.seconds(10))
      })
    })
  }
}

export interface AsyncAudioModeratorProps {
  bucket?: s3.IBucket,
}

export class AsyncAudioModeratorConstruct extends Construct {

  public moderator: SfnAudioModerator;

  constructor(scope: Construct, id: string, props: AsyncAudioModeratorProps) {
    super(scope, id);

    var bucket: s3.IBucket;
    if (props.bucket != undefined){
      bucket = props.bucket;
    } else {
      bucket = new s3.Bucket(this, 'DefaultBucket')
    }

    this.moderator = new SfnAudioModerator(this, 'SfnAudioModerator', {
      bucket: bucket
    });

    var rule = new e.Rule(this, 'Rule', {
      eventPattern: {
        "resources": [bucket.bucketArn],
        "detailType": ["Object Created"],
        "source": ["aws.s3"]
      }
    })

    rule.addTarget(new et.SfnStateMachine(this.moderator.stateMachine))
  }
}
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
import { PostModerateImage } from './api-sfn/images';
import { PostModerateAudio } from './api-sfn/audio';
import { PostModerateText } from './api-sfn/text';
import { PostModerateDocument } from './api-sfn/document';
import { postModerateVideo } from './api-sfn/video';

export class ModerationApiStepFunctions extends Construct {
  
  public readonly postModerateAudio: sf.IStateMachine;
  public readonly postModerateDocument: sf.IStateMachine;
  public readonly postModerateImage: sf.IStateMachine;
  public readonly postModerateText: sf.IStateMachine;
  public readonly postModerateVideo: sf.IStateMachine;
  
  public gatewayRole: iam.Role;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.postModerateAudio = new PostModerateAudio(this,'Audio').syncStateMachine;
    
    this.postModerateDocument = new PostModerateDocument(this,'PostDocument').stateMachine;

    this.postModerateImage = new PostModerateImage(this,'Image').syncStateMachine;

    this.postModerateText = new PostModerateText(this,'Text').syncStateMachine;

    this.postModerateVideo= new postModerateVideo(this,'Video').syncStateMachine;

    // Create the role for an apigateway to call these operations.
    this.gatewayRole = new iam.Role(this,'GatewayRole',{
      assumedBy: new iam.ServicePrincipal('apigateway'),
      managedPolicies:[
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSStepFunctionsFullAccess')
      ]
    });
  }
}

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

export class ModerationApiStepFunctions extends Construct {
  
  
  public readonly postModerateAudio: sf.IStateMachine;
  public readonly postModerateDocument: sf.IStateMachine;
  public readonly postModerateImage: sf.IStateMachine;
  public readonly postModerateText: sf.IStateMachine;
  public readonly postModerateVideo: sf.IStateMachine;
  
  public gatewayRole: iam.Role;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.postModerateAudio = new PostModerateAudio(this,'ModerateAudio').stateMachine;
    
    new sf.StateMachine(this,'PostAudio',{
      definition: new sf.Pass(this,'AudioPlaceholder'),
      stateMachineType: sf.StateMachineType.EXPRESS,
    });

    this.postModerateDocument = new sf.StateMachine(this,'PostDocument',{
      definition: new sf.Pass(this,'DocPlaceholder'),
      stateMachineType: sf.StateMachineType.EXPRESS,
    });


    this.postModerateImage = new PostModerateImage(this,'PostImage').stateMachine;

    this.postModerateText = new sf.StateMachine(this,'PostText',{
      definition: new sf.Pass(this,'TextPlaceholder'),
      stateMachineType: sf.StateMachineType.EXPRESS,
    });

    this.postModerateVideo= new sf.StateMachine(this,'PostVideo',{
      definition: new sf.Pass(this,'VideoPlaceholder'),
      stateMachineType: sf.StateMachineType.EXPRESS,
    });

    // Create the role for an apigateway to call these operations.
    this.gatewayRole = new iam.Role(this,'GatewayRole',{
      assumedBy: new iam.ServicePrincipal('apigateway'),
      managedPolicies:[
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSStepFunctionsFullAccess')
      ]
    });
  }
}

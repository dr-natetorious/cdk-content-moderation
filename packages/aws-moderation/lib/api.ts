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
import { ModerationApiStepFunctions } from './api_sfn';


export class ModerationApi extends Construct {

  protected rootResource: api.Resource;
  protected modSfn: ModerationApiStepFunctions;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const gateway = new api.RestApi(this,'APIG',{
      deploy:true,
      description: "Content Moderation API",
    })

    this.rootResource = gateway.root.addResource('Moderate');
    this.modSfn = new ModerationApiStepFunctions(this,'Functions');
       
    
    this.addModeratedResource('Audio', this.modSfn.postModerateAudio)
    this.addModeratedResource('Document', this.modSfn.postModerateDocument)
    this.addModeratedResource('Image', this.modSfn.postModerateImage)
    this.addModeratedResource('Text', this.modSfn.postModerateText)
    this.addModeratedResource('Video', this.modSfn.postModerateVideo)
  }

  private addModeratedResource(typeName:string, stateMachine: sf.IStateMachine): api.Resource{
    const childResource = this.rootResource.addResource(typeName)
    childResource.addMethod('POST', 
      api.StepFunctionsIntegration.startExecution(stateMachine,{
        passthroughBehavior: api.PassthroughBehavior.NEVER,
        credentialsRole: this.modSfn.gatewayRole,
        requestTemplates: {
          "application/json": ModerationApi.makeRequestTemplate(this.modSfn.postModerateImage.stateMachineArn)
        }
      }));

    return childResource;
  }

  /**
   * Generates a VTL template for passing an Amazon API Gateway Request to AWS Step Functions Express.
   * @param stateMachineArn The target stateMachine
   * @returns VTL template literal
   */
  static makeRequestTemplate(stateMachineArn:string): string{
    return `
      #set($inputRoot = $input.Path('$')) {
        "stateMachineArn": "${stateMachineArn}",
        "input": "{ \\"inputRequest\\": $util.escapeJavaScript( $input.json('$')) }"
      }`
  }
}

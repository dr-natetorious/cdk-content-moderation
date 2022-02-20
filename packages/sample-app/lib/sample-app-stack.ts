import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

// import * as sqs from 'aws-cdk-lib/aws-sqs';
//import { AsyncAudioModeratorConstruct } from '../../aws-moderation/lib/audio'
import { ModerationApi } from '../../aws-moderation/lib/api'

export class SampleAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const api = new ModerationApi(this,'ModerationApi');
  }
}

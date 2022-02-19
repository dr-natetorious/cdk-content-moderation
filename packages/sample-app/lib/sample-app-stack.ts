import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

// import * as sqs from 'aws-cdk-lib/aws-sqs';

import { AsyncAudioModeratorConstruct } from '../../aws-moderation/lib/audio'

export class SampleAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    new AsyncAudioModeratorConstruct(this, 'AsyncAudioModeratorConstruct', {
    })

    // example resource
    // const queue = new sqs.Queue(this, 'SampleAppQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}

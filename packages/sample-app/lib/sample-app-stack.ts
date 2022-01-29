import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { AwsModeration} from '../../aws-moderation/lib/index'
//import * as m  from '@aws-moderation/'


// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class SampleAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new AwsModeration(this,'Moderation')

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'SampleAppQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}

import { Construct } from 'constructs';
import { aws_s3 as s3 } from 'aws-cdk-lib'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export interface AwsModerationProps {
  // Define construct properties here
}

export class AwsModeration extends Construct {

  constructor(scope: Construct, id: string, props: AwsModerationProps = {}) {
    super(scope, id);


    var bucket = new s3.Bucket(this,'MyBucket')

    // Define construct contents here

    // example resource
    // const queue = new sqs.Queue(this, 'AwsModerationQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}

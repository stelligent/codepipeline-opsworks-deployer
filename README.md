# CodePipeline OpsWorks Deployer

## What is this?

This is a Lambda function which allows you to deploy to OpsWorks using [CodePipeline](http://aws.amazon.com/codepipeline/) by
implementing a [custom action](http://docs.aws.amazon.com/codepipeline/latest/userguide/how-to-create-custom-action.html).
 
**You can find a full guide on setting it up [on my blog](http://hipsterdevblog.com/blog/2015/07/28/deploying-from-codepipeline-to-opsworks-using-a-custom-action-and-lambda/)**

When configured you can use it just like the inbuilt stage actions: 
![Diagram](http://hipsterdevblog.com/images/posts/opsworks_codepipeline/actionopts.png)
 
## How does it work?

It uses S3 put notifications to trigger the Lambda function, then SNS retries to implement polling.

Here's a general diagram of how it works:

![Diagram](http://hipsterdevblog.com/images/posts/opsworks_codepipeline/codepipelineopsworks-diagram.png)

## Detailed Manual Steps

**NOTE: These steps will be automated later. This README is currently under construction.**

You'll want to keep note of the following values:
* S3 bucket and key for the OpsWorks artifact zip file
* OpsWorks Stack ID
* OpsWorks App ID
* SNS ARN
* SNS Event Subscription ARN
* Deploy Provider Name - the custom action name that you create for CodePipeline
* Lambda Function ARN

### Steps

* Launch an EC2 instance using Amazon Linux or run from your local environment. The remainder of the instructions assume EC2, so adjust the commands as necessary.
* After SSHing into the EC2 instance, install Git: `sudo yum -y install git*`
* Clone this Git repo: `git clone https://github.com/stelligent/codepipeline-opsworks-deployer`
* Create an OpsWorks Artifact Bucket in [S3](https://console.aws.amazon.com/s3/) and upload the zip file from https://github.com/awslabs/aws-codepipeline-s3-aws-codedeploy_linux/tree/master/dist. Be sure to enable versioning on the bucket for CodePipeline by right clicking on Properties for the Bucket, select Versioning and click the Enable Versioning button.
* Manually create an [OpsWorks](https://console.aws.amazon.com/opsworks/) stack using a static S3 website w/ Chef 11.10. Configure your OpsWorks stack with CodePipeline/CodeDeploy zip file deployed (from the above step)
* Create an [SNS](https://console.aws.amazon.com/sns/) Topic. Edit Topic Delivery Policy|Advanced View, use the source from: `opsworks-sns-topic-delivery-policy.json` (Update the variables)
* From the SNS Actions button, select **Edit Topic Policy** with `opsworks-sns-topic-policy.json` (Update the variables)
* Create [Lambda IAM Role](https://console.aws.amazon.com/iam/). For the inline policy, use `opsworks-lambda-role.json`. select *AWS Lambda* as the type.
* Create the [Lambda Function](https://console.aws.amazon.com/lambda/) using the Hello World Node.js sample code.
* Go the **Event Source** tab in Lambda and link it to the SNS Topic you previosuly created. Keep the **Enabled Later** button selected.
* Subscribe SNS to events for CodePipeline bucket in S3 by right clicking on the bucket, select **Properties**, then **Events**. Include `Put`, `Post`, `Copy` and `CompleteMultiPartUpload`. Select the name of the SNS Topic you previously created.
* Manually create a pipeline in [CodePipeline](https://console.aws.amazon.com/codepipeline/)by using the steps/video shown at: [Create a Pipeline using the AWS CodePipeline Console](http://www.stelligent.com/cloud/create-a-pipeline-using-the-aws-codepipeline-console/)
* Create and save a script that defines a custom CodePipeline action (use codepipeline-customer-action-input.json): `sudo vim codepipeline-customer-action-input.json`
* Apply the custom action: `aws codepipeline create-custom-action-type --cli-input-json file://codepipeline-customer-action-input.json`
* In [CodePipeline](https://console.aws.amazon.com/codepipeline/), add a new stage called `OpsWorks` (you can name it anything you’d like) and action in between the Source and Beta stages. When configuring the action, use the **Deploy** category and select the name of the custom action you just created fro the **Deployment Provider** drop down. Enter the three values for the parameters of the action. 
* From your EC2 instance, change the directory: `cd ~/codepipeline-opsworks-deployer`
* Install npm: `sudo npm install`
* Install the Grunt CLI: `sudo npm install -g grunt-cli`
* Update your local version of [lib/handle_job.js](https://github.com/stelligent/codepipeline-opsworks-deployer/blob/master/lib/handle_job.js) with the name of the Deploy Provider (i.e. the name of the custom action you created)
* Update your local versions of  [event_handle.json](https://github.com/stelligent/codepipeline-opsworks-deployer/blob/master/event_handle.json) and [event_monitor.json](https://github.com/stelligent/codepipeline-opsworks-deployer/blob/master/event_monitor.json) with clean message and ARNs that match the SNS Topic and Event Subscription you created
* Update the Grunt build file: `sudo vim Gruntfile.js`
* Update the `arn` for the Lambda function in `lambda_deploy` and save the file.
* Upload Lambda function using Grunt by calling `grunt deploy` from the command line on the EC2 instance.
* From the **Event Sources** tab of the [Lambda](https://console.aws.amazon.com/lambda/) function, update the SNS source state to Enabled.
* Click **Release change** button on [CodePipeline](https://console.aws.amazon.com/codepipeline/)
* Copy the generated file from your EC2 instance to S3 bucket. Replace `generated-file-name.zip` and `my-bucket` with the actual names.
`aws s3 cp /home/ec2-user/codepipeline-opsworks-deployer/dist/generated-file-name.zip s3://my-bucket/ --storage-class REDUCED_REDUNDANCY`

## How do I develop on this?

You might find the following two grunt functions useful:

`grunt lambda_invoke_monitor`
`grunt lambda_invoke_task`

You may also want to monitor the two event_something.json files to reference resources within your own account.

Finally, if you're using this as a base for another action you might want to change the `buildProvider` variable in
`lib/handle_job.js` to a different name.

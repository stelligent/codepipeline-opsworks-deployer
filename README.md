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
* OpsWorks Stack ARN 
* OpsWorks App ID 
* SNS ARN 
* SNS Event Subscription ARN 
* Deploy Provider Name - the custom action name that you create for CodePipeline 
* Lambda Function ARN 

### Steps

1. Launch an EC2 instance using Amazon Linux or run from your local environment. The remainder of the instructions assume EC2, so adjust the commands as necessary.
1. Configure yout AWS environment by typing `aws configure` and entering your credentials, region and output type.
1. After SSHing into the EC2 instance, install Git: `sudo yum -y install git*`
1. Install node: `sudo yum install -y nodejs npm --enablerepo=epel`
1. Clone this Git repo: `git clone https://github.com/stelligent/codepipeline-opsworks-deployer`
1. Create an OpsWorks Artifact Bucket in [S3](https://console.aws.amazon.com/s3/) and upload the zip file from https://github.com/awslabs/aws-codepipeline-s3-aws-codedeploy_linux/tree/master/dist. Be sure to enable versioning on the bucket for CodePipeline by right clicking on **Properties** for the bucket, select **Versioning** and click the **Enable Versioning** button.
1. Manually create an [OpsWorks](https://console.aws.amazon.com/opsworks/) stack using  w/ Chef 11.10. When creating an OpsWorks layer, use the **Static Web Server** Layer type. Use the **S3 Archive** repository type when creating the App in OpsWorks. Configure your OpsWorks stack with CodePipeline/CodeDeploy zip file deployed (from the above step). Once it's successfully deployed, make note of the *OpsWorks Stack ID*. and *OpsWorks App ID*.
1. Create an [SNS](https://console.aws.amazon.com/sns/) Topic. 
1. Select the newly-created SNS topic and click on the **Other topic actions** button, select **Edit topic Policy**. Go the **Advanced View** tab and copy the contents from [support/opsworks-sns-topic-policy.json](https://github.com/stelligent/codepipeline-opsworks-deployer/blob/master/support/opsworks-sns-topic-policy.json). Update the `SNSTOPICARN` and `OPSWORKSARTIFACTBUCKET` variables. Click the **Update policy** button.
1. With the newly-created SNS topic selected, click on the **Other topic actions** button and select **Edit topic delivery policy**. Then, click on the **Advanced View** tab and copy the source from: [support/opsworks-sns-topic-delivery-policy.json](https://github.com/stelligent/codepipeline-opsworks-deployer/blob/master/support/opsworks-sns-topic-delivery-policy.json). Click the **Update policy** button.
1. Create [Lambda IAM Role](https://console.aws.amazon.com/iam/home#roles). Use *AWS Lambda* as the type. For the inline policy, copy the contents of [support/opsworks-lambda-role.json](https://github.com/stelligent/codepipeline-opsworks-deployer/blob/master/support/opsworks-lambda-role.json) and modify these values: `OPSWORKSARTIFACTBUCKET`, `OPSWORKSARN` and `SNSTOPICARN`. Click the **Validate policy** and **Apply policy** buttons.
1. Create the [Lambda Function](https://console.aws.amazon.com/lambda/) using the Hello World Node.js sample code. Use the IAM role you created in the previous step. Make note of the *Lambda function ARN**
1. Go the **Event Source*. tab in Lambda and link it to the SNS Topic you previosuly created. Keep the **Enable Later** button selected.
1. Subscribe SNS to events for CodePipeline bucket in [S3](https://console.aws.amazon.com/s3/) by right clicking on the bucket, select **Properties**, then **Events**. Include `Put`, `Post`, `Copy` and `CompleteMultiPartUpload`. Make note of the *SNS ARN* and the *SNS Event Subscription ARN*. by going to [SNS](https://console.aws.amazon.com/sns/) and selecting the Topic you created.
1. Manually create a pipeline in [CodePipeline](https://console.aws.amazon.com/codepipeline/) by using the steps/video described at [Create a Pipeline using the AWS CodePipeline Console](http://www.stelligent.com/cloud/create-a-pipeline-using-the-aws-codepipeline-console/)
1. Create an empty script: `sudo vim codepipeline-customer-action-input.json`. Copy the contents from [support/codepipeline-customer-action-input.json](https://github.com/stelligent/codepipeline-opsworks-deployer/blob/master/support/codepipeline-customer-action-input.json) and update the `YOURPROVIDERNAME` to a unique name.
1. Apply the custom action: `aws codepipeline create-custom-action-type --cli-input-json file://codepipeline-customer-action-input.json`
1. In [CodePipeline](https://console.aws.amazon.com/codepipeline/), add a new stage called `OpsWorks` (you can name it anything you’d like) and action in between the Source and Beta stages. When configuring the action, use the **Deploy** category and select the name of the custom action you just created fro the **Deployment Provider** drop down. Enter the three values for the parameters of the action. 
1. From your EC2 instance, change the directory: `cd ~/codepipeline-opsworks-deployer`
1. Install npm: `sudo npm install`
1. Install the Grunt CLI: `sudo npm install -g grunt-cli`
1. Update the `YOURPROVIDERNAME` value in your local version of [lib/handle_job.js](https://github.com/stelligent/codepipeline-opsworks-deployer/blob/master/lib/handle_job.js) with the name of the Deploy Provider (i.e. the name of the custom action you created). Save this file.
1. Update the `SNSEVENTSUBSCRIPTIONARN` and `SNSTOPICARN` with the appropriate values in your local versions of  [event_handle.json](https://github.com/stelligent/codepipeline-opsworks-deployer/blob/master/event_handle.json) and [event_monitor.json](https://github.com/stelligent/codepipeline-opsworks-deployer/blob/master/event_monitor.json). Save these files.  
1. Open the Grunt build file: `sudo vim Gruntfile.js` and update `LAMBDAARN` value to the ARN matching the the Lambda function you created and save the file.
1. Upload the Lambda function using Grunt by calling `grunt deploy` from the command line on the EC2 instance.
1. From the **Event Sources** tab of the [Lambda](https://console.aws.amazon.com/lambda/) function, click the `Disabled` state in the SNS source entry and click the **Enable** button.
1. Click **Release change** button on [CodePipeline](https://console.aws.amazon.com/codepipeline/)
1. Copy the generated file from your EC2 instance to S3 bucket. Replace `GENERATED-FILE-NAME.zip` and `MY-BUCKET` with the actual names.
`aws s3 cp /home/ec2-user/codepipeline-opsworks-deployer/dist/GENERATED-FILE-NAME.zip s3://MY-BUCKET/ --storage-class REDUCED_REDUNDANCY`

## How do I develop on this?

You might find the following two grunt functions useful:

`grunt lambda_invoke_monitor`
`grunt lambda_invoke_task`

You may also want to monitor the two event_something.json files to reference resources within your own account.

Finally, if you're using this as a base for another action you might want to change the `buildProvider` variable in
`lib/handle_job.js` to a different name.

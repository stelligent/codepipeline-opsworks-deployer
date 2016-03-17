var grunt = require('grunt');
grunt.loadNpmTasks('grunt-aws-lambda');

grunt.initConfig({
    lambda_invoke: {
        task: {
            options: {
                event: 'event_handle.json'
            }
        },
        monitor: {
            options: {
                event: 'event_monitor.json'
            }
        }
    },
    lambda_deploy: {
        default: {
            arn: 'LAMBDAARN'
        }
    },
    lambda_package: {
        default: {
        }
    }
});

grunt.registerTask('deploy', ['lambda_package', 'lambda_deploy']);
grunt.registerTask('lambda_invoke_monitor', ['lambda_invoke:monitor']);
grunt.registerTask('lambda_invoke_task', ['lambda_invoke:task']);

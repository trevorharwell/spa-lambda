# spa-lambda
Single Page Application S3 file serving lambda with runtime configuration injection.

The point of this project is to provide a reusable lambda deployment that can serve a SPA.  The differentiating feature of this lambda is that it will inject configuration into your project.  This is extremely important to providing a CD pipeline where you can build once and deploy anywhere.  There is a long discussion about this problem here: https://github.com/facebookincubator/create-react-app/issues/578

# Deployment
This project includes a parameterized coudformation template that accpets the following input:
- BucketName - The S3 bucket where your static application files are located
- VersionKey - The folder prefix key that specifies where in S3 bucket the correct version of your application should be pulled from
- VariablePrefix - The environment variable string prefix that should be used to search for configuration.  By default the prefix is `JS_APP_`.  This means that the variable `JS_APP_API_URL` would get picked up from the lamba environment and injected into the SPA.
- IndexFileName - The name of the file that should be treated as the index.  By modern convention, any request path that does not match with an actual file will result in the index file response (this is to support push state routing)
- ConfigurationPath - The path where the full map of configuration keys and values can be requested.

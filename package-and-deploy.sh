#!/bin/bash

aws cloudformation package \
  --template "cloudformation.yml" \
  --s3-bucket spa-lambda-storage \
  --output-template-file packaged-cloudformation.yml

aws s3 cp packaged-cloudformation.yml s3://elysion-public-storage/spa-lambda-template.yml
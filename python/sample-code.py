from time import sleep
import boto3
from os import environ
from uuid import uuid4
from datetime import datetime, timedelta

transcribe_client = boto3.client('transcribe')

# Expected format: arn:partition:service:region:account-id:resource-type/resource-id
TRANSCRIBE_DATA_ACCESS_ROLE_ARN = environ.get('TRANSCRIBE_DATA_ACCESS_ROLE')

async def transcribe_audio_file_async(bucket:str, object_key:str)->dict:
  '''
  Transcribe the specified file.
  :param bucket: The Amazon S3 bucket containing the file
  :param object_key: The object within the bucket 
  '''
  startJobResponse = transcribe_client.start_transcription_job(
    TranscriptionJobName=str(uuid4()),
    Media={
      'MediaFileUri': 's3://{}/{}' % (bucket,object_key)
    },
    Settings={
      'VocabularyName':'MyCustomVocabulary'
    },
    JobExecutionSettings={
      'AllowDeferredExecution':True,
      'DataAccessRoleArn': TRANSCRIBE_DATA_ACCESS_ROLE_ARN
    })

  # Wait for the job to complete
  timeout = datetime.utcnow() + timedelta(minutes=5)
  while datetime.utcnow() < timeout:
    getJobResponse = transcribe_client.get_transcription_job(
      TranscriptionJobName=startJobResponse['TranscriptionJob']['TranscriptionJobName'])

    transcriptionJob = getJobResponse['TranscriptionJob']
    jobStatus = transcriptionJob['TranscriptionJobStatus']
    if jobStatus == 'FAILED':
      raise Exception('Unable to transcribe file due to %s' % transcriptionJob['FailureReason'])
    elif jobStatus == 'COMPLETED':
      return transcriptionJob['Transcript']
    else:
      sleep(15)

  raise TimeoutError('Transcription job exceeded the timeout')

    


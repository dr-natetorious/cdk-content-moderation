from typing import List, Mapping

def process_event(event:dict, _:dict)->dict:
  languages:List[Mapping[str,str]] = event['Languages']
  languages.sort(key= lambda x: x['Score'], reverse=True)
  return {
    'LanguageCode': languages[0]['LanguageCode']
  }
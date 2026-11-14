"""Bounded Phase 2 public metadata checks; no credentials or retries."""
import json, pathlib, urllib.request, urllib.error, datetime, time
root = pathlib.Path(__file__).parent
root = root / ('run-' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
root.mkdir(exist_ok=False)
fields = 'id idMal title { romaji english native } episodes status format startDate { year month day } endDate { year month day }'
queries = {
 'detail': '{ Media(id:1,type:ANIME) { '+fields+' } }',
 'page1': '{ Page(page:1,perPage:1) { pageInfo { currentPage hasNextPage } media(search:"Cowboy Bebop",type:ANIME,sort:ID) { '+fields+' } } }',
 'page2': '{ Page(page:2,perPage:1) { pageInfo { currentPage hasNextPage } media(search:"Cowboy Bebop",type:ANIME,sort:ID) { '+fields+' } } }',
 'upcoming': '{ Page(page:1,perPage:2) { media(type:ANIME,status:NOT_YET_RELEASED,isAdult:false,sort:ID_DESC) { '+fields+' } } }',
 'ongoing': '{ Page(page:1,perPage:2) { media(type:ANIME,status:RELEASING,isAdult:false,sort:ID) { '+fields+' } } }'
}
log=[]
for name,query in queries.items():
    payload={'query':query}
    item={'name':name,'timestamp_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'POST','url':'https://graphql.anilist.co','request_json':payload}
    req=urllib.request.Request(item['url'],data=json.dumps(payload).encode(),headers={'Content-Type':'application/json','User-Agent':'AnimeWebsite-Phase2-Research/1.0'})
    try:
        try: response=urllib.request.urlopen(req,timeout=20)
        except urllib.error.HTTPError as e: response=e
        body=response.read().decode('utf-8'); item['status']=response.status
        item['headers']={k:v for k,v in response.headers.items() if k.lower() in ('content-type','x-ratelimit-limit','x-ratelimit-remaining','retry-after')}
        item['response_json']=json.loads(body)
    except Exception as e: item['error']=str(e)
    log.append(item)
    print(name,item.get('status'),json.dumps(item.get('response_json'),ensure_ascii=True))
    if item.get('status') in (403,429): break
    time.sleep(2)
(root/'supplement-probes.json').write_text(json.dumps(log,ensure_ascii=False,indent=2),encoding='utf-8')

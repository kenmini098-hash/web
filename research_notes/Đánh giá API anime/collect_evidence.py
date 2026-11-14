"""Small read-only documentation and API probes; no credentials or retries."""
import json, urllib.request, urllib.error, datetime, pathlib, html.parser
ROOT = pathlib.Path(__file__).parent
class Text(html.parser.HTMLParser):
    def __init__(self): super().__init__(); self.parts=[]; self.skip=0
    def handle_starttag(self,tag,attrs):
        if tag in ('script','style'): self.skip+=1
    def handle_endtag(self,tag):
        if tag in ('script','style'): self.skip=max(0,self.skip-1)
    def handle_data(self,d):
        if d.strip() and not self.skip: self.parts.append(d.strip())
targets = {
 'anilist-terms': ('https://raw.githubusercontent.com/AniList/docs/master/docs/guide/terms-of-use.md',None),
 'anilist-rate': ('https://raw.githubusercontent.com/AniList/docs/master/docs/guide/rate-limiting.md',None),
 'anilist-pagination': ('https://raw.githubusercontent.com/AniList/docs/master/docs/guide/graphql/pagination.md',None),
 'mal-reference': ('https://myanimelist.net/apiconfig/references/api/v2',None),
 'mal-terms': ('https://myanimelist.net/static/apiagreement.html',None),
 'jikan-spec': ('https://raw.githubusercontent.com/jikan-me/jikan-rest/master/storage/api-docs/api-docs.json',None),
 'jikan-announcement': ('https://api.github.com/repos/jikan-me/jikan-rest/issues/613',None),
 'anilist-probe': ('https://graphql.anilist.co', {'query':'query { Page(page:1, perPage:2) { pageInfo { currentPage hasNextPage perPage } media(search:"Cowboy Bebop",type:ANIME,isAdult:false) { id idMal title { romaji english native } episodes format status averageScore siteUrl } } }'}),
 'mal-probe-no-credentials': ('https://api.myanimelist.net/v2/anime?q=Cowboy%20Bebop&limit=1',None),
 'jikan-probe': ('https://api.jikan.moe/v4/anime/1',None),
}
results=[]
for name,(url,body) in targets.items():
    started=datetime.datetime.now(datetime.timezone.utc).isoformat()
    req=urllib.request.Request(url,data=json.dumps(body).encode() if body else None,headers={'User-Agent':'AnimeWebsite-Phase2-Research/1.0','Content-Type':'application/json'} if body else {'User-Agent':'AnimeWebsite-Phase2-Research/1.0'})
    record={'name':name,'url':url,'method':req.get_method(),'timestamp_utc':started,'request_json':body}
    try:
        try: response=urllib.request.urlopen(req,timeout=20)
        except urllib.error.HTTPError as e: response=e
        raw=response.read(); record.update(status=response.status,headers={k:v for k,v in response.headers.items() if k.lower() not in ('set-cookie','cookie','authorization')},bytes=len(raw))
        text=raw.decode('utf-8',errors='replace'); (ROOT/(name+'.txt')).write_text(text,encoding='utf-8')
        if 'html' in response.headers.get('Content-Type',''):
            parser=Text(); parser.feed(text); (ROOT/(name+'-readable.txt')).write_text('\n'.join(parser.parts),encoding='utf-8')
    except Exception as e: record['transport_error']=str(e)
    results.append(record)
    print(name,record.get('status'),record.get('bytes'),record.get('transport_error',''))
(ROOT/'request-log.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')

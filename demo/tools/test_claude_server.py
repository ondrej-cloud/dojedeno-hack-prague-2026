#!/usr/bin/env python3
"""No-spend HTTP integration tests for serve.py.

Run: python3 demo/tools/test_claude_server.py
Uses a temporary checkout, fake Claude module and free ports. It never reads
real credentials, touches the running demo, or contacts Anthropic.
"""
import concurrent.futures
import http.client
import json
import pathlib
import shutil
import signal
import socket
import ssl
import subprocess
import sys
import tempfile
import time
import urllib.request
import urllib.error
source=pathlib.Path(__file__).resolve().parents[1]
def free():
 with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
with tempfile.TemporaryDirectory(prefix='dojedeno-server-') as folder:
 root=pathlib.Path(folder);(root/'tools').mkdir();shutil.copy(source/'tools/serve.py',root/'tools/serve.py');shutil.copy(source/'config.json',root/'config.json')
 (root/'tools/claude_client.py').write_text('''import time
calls=0
class AnalysisError(Exception):
 def __init__(self): self.status_code=422;self.public_message='Bezpečná chyba'
def get_status():return {'configured':True,'model':'fake-no-spend'}
def analyze(payload,menu,quantity_mode='estimate'):
 global calls
 calls+=1
 if payload.get('slow'):time.sleep(.8)
 if payload.get('fail'):raise AnalysisError()
 if payload.get('rawError'):raise RuntimeError('PRIVATE-UPSTREAM-SECRET')
 return {'result':{'calls':calls,'quantityMode':quantity_mode},'model':'fake-no-spend','usage':{}}
''')
 httpport,httpsport=free(),free();base=f'http://127.0.0.1:{httpport}';secure=f'https://127.0.0.1:{httpsport}'
 def request(path,payload=None,headers=None):
  raw=None if payload is None else json.dumps(payload).encode()
  req=urllib.request.Request(path,data=raw,headers={'Content-Type':'application/json',**(headers or {})})
  try:
   with urllib.request.urlopen(req,context=ssl._create_unverified_context()) as r:return r.status,json.loads(r.read() or '{}')
  except urllib.error.HTTPError as e:return e.code,json.loads(e.read() or '{}')
 def start():
  p=subprocess.Popen([sys.executable,str(root/'tools/serve.py'),'--ip','127.0.0.1','--http-port',str(httpport),'--https-port',str(httpsport)],stdout=subprocess.DEVNULL)
  for _ in range(50):
   try:request(base+'/api/status');return p
   except OSError:
    if p.poll() is not None:raise RuntimeError('server exited during startup')
    time.sleep(.1)
  p.terminate();p.wait(timeout=5)
  raise RuntimeError('startup failed')
 p=start()
 try:
  status=request(base+'/api/status')[1];assert status['analysis']['configured'];phone=status['phoneUrl']
  a={'requestId':'one','phase':'full','image':'fake'}
  assert request(base+'/api/analyze',a)[1]['result']['calls']==1
  assert request(base+'/api/analyze',a)[1]['result']['calls']==1
  assert request(base+'/api/analyze',{**a,'image':'changed'})[0]==409
  for headers in [{'Host':'attacker.test'},{'Origin':'http://attacker.test'},{'Sec-Fetch-Site':'cross-site'}]:
   assert request(base+'/api/analyze',a,headers)[0]==403
  assert request(secure+'/api/analyze',a)[0]==403
  assert request(base+'/api/analyze',{'requestId':''})[0]==400
  c=http.client.HTTPConnection('127.0.0.1',httpport);c.putrequest('POST','/api/analyze');c.putheader('Content-Type','application/json');c.putheader('Content-Length',str(3*1024*1024+1));c.endheaders();assert c.getresponse().status==413;c.close()
  with concurrent.futures.ThreadPoolExecutor() as pool:
   slow={**a,'requestId':'slow','slow':True};future=pool.submit(request,base+'/api/analyze',slow);time.sleep(.2)
   assert request(base+'/api/analyze',slow)[0]==409
   assert request(base+'/api/analyze',{**a,'requestId':'other'})[0]==429
   assert future.result()[0]==200
  fail={**a,'requestId':'failure','fail':True};assert request(base+'/api/analyze',fail)==(422,{'error':'Bezpečná chyba'})
  assert request(base+'/api/analyze',fail)==(422,{'error':'Bezpečná chyba'})
  code,error=request(base+'/api/analyze',{**a,'requestId':'raw','rawError':True});assert code==502 and 'PRIVATE-UPSTREAM-SECRET' not in json.dumps(error)
  config=(root/'config.json').read_text();(root/'config.json').write_text('{broken')
  code,error=request(base+'/api/analyze',{**a,'requestId':'badconfig'});assert code==502
  (root/'config.json').write_text(config)
  assert request(base+'/api/analyze',{**a,'requestId':'badconfig'})[0]==502,'same failed ID remains cached'
  assert request(base+'/api/analyze',{**a,'requestId':'recovered'})[0]==200,'new ID retries after correcting config'
  assert (root/'.local/phone-token').stat().st_mode&0o777==0o600
  p.send_signal(signal.SIGINT);p.wait(timeout=5);p=start();assert request(base+'/api/status')[1]['phoneUrl']==phone
  print('PASS no-spend HTTP integration: success/cache/content conflict, concurrency409/429, malformed400, size413, origin/host/crosssite403, HTTPS403, safe cached errors, token persistence600.')
 finally:
  if p.poll() is None:p.send_signal(signal.SIGINT);p.wait(timeout=5)
